import { getAllProducts } from "@/lib/data";

// Local inventory feed for Google Merchant Center (free local listings):
// tells Google which items are physically in the shop at 51 High Street, Evesham.
//   https://www.charmchase.co.uk/local-inventory.xml
// Product ids match /feed.xml (database UUID). Every item for sale is in the shop.

export const revalidate = 3600;

// Store code of the verified Google Business Profile "Charm Chase Antiques & Vintage Shop".
// Set LOCAL_STORE_CODE in Vercel; the fallback is used until then.
const STORE_CODE = process.env.LOCAL_STORE_CODE || "07357259786581789218";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const all = await getAllProducts();

  const items = all
    .filter((p) => !p.status || p.status === "available")
    .filter((p) => (p.images && p.images.length) || p.image) // same set as /feed.xml
    .map((p) => {
      const dbId = (p as typeof p & { id?: string }).id;
      const id = dbId ? String(dbId) : p.slug.slice(0, 50);
      return `<item>
  <g:store_code>${esc(STORE_CODE)}</g:store_code>
  <g:id>${esc(id)}</g:id>
  <g:availability>in_stock</g:availability>
  <g:quantity>1</g:quantity>
  <g:price>${(p.price / 100).toFixed(2)} GBP</g:price>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>CharmChase — in-store inventory (Evesham)</title>
<link>https://www.charmchase.co.uk</link>
<description>Items available at 51 High Street, Evesham WR11 4DA.</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
