import { getAllProducts } from "@/lib/data";

// Image sitemap (update 114): tells Google which photos belong to which
// product page, so Google Lens / Images results open the item itself.
// Listed in robots.txt next to sitemap.xml.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = "https://www.charmchase.co.uk";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function abs(u: string) {
  return u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

export async function GET() {
  const products = await getAllProducts();
  const urls = products
    .filter((p) => !p.status || p.status === "available")
    .map((p) => {
      const photos = (p.images && p.images.length ? p.images : p.image ? [p.image] : []).slice(0, 20);
      if (!photos.length) return "";
      return `  <url>
    <loc>${BASE}/product/${esc(p.slug)}</loc>
${photos.map((u) => `    <image:image><image:loc>${esc(abs(u))}</image:loc></image:image>`).join("\n")}
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
