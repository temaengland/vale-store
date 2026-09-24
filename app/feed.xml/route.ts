import { getAllProducts } from "@/lib/data";
import { Product } from "@/lib/products";

// Product feed for Google Merchant Center (free Shopping listings)
// and Meta Commerce Manager (Instagram / Facebook Shop).
//   Google: https://www.charmchase.co.uk/feed.xml
//   Meta:   https://www.charmchase.co.uk/feed.xml?platform=meta
// Rebuilt at most once an hour, so new items appear automatically.

export const revalidate = 3600;

const BASE_URL = "https://www.charmchase.co.uk";

const GOOGLE_CATEGORY: Record<Product["category"], string> = {
  furniture: "Furniture",
  jewelry: "Apparel & Accessories > Jewelry",
  decor: "Home & Garden > Decor",
  art: "Home & Garden > Decor > Artwork",
};

const CATEGORY_NAME: Record<Product["category"], string> = {
  furniture: "Furniture",
  jewelry: "Jewellery & Watches",
  decor: "Decor",
  art: "Art",
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absUrl(u: string) {
  return u.startsWith("http") ? u : `${BASE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

function itemXml(p: Product, isMeta: boolean): string | null {
  const photos = (p.images && p.images.length ? p.images : p.image ? [p.image] : []).map(absUrl);
  if (!photos.length) return null; // both platforms reject items without a photo

  const title = p.name.slice(0, 150);
  const description = (p.description || p.name).replace(/\s+/g, " ").trim().slice(0, 5000);
  const productType = [CATEGORY_NAME[p.category], p.subcategory, p.era].filter(Boolean).join(" > ");

  const lines = [
    `<g:id>${esc(p.slug)}</g:id>`,
    `<g:title>${esc(title)}</g:title>`,
    `<g:description>${esc(description)}</g:description>`,
    `<g:link>${BASE_URL}/product/${encodeURIComponent(p.slug)}</g:link>`,
    `<g:image_link>${esc(photos[0])}</g:image_link>`,
    ...photos.slice(1, 11).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`),
    `<g:availability>in stock</g:availability>`,
    `<g:price>${(p.price / 100).toFixed(2)} GBP</g:price>`,
    `<g:condition>used</g:condition>`,
    `<g:google_product_category>${esc(GOOGLE_CATEGORY[p.category])}</g:google_product_category>`,
    `<g:product_type>${esc(productType)}</g:product_type>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
  ];
  // Meta requires a brand; Google prefers none for one-off antiques.
  if (isMeta) lines.push(`<g:brand>CharmChase</g:brand>`);
  if (p.weight_grams) lines.push(`<g:shipping_weight>${p.weight_grams} g</g:shipping_weight>`);

  return `<item>\n${lines.map((l) => "  " + l).join("\n")}\n</item>`;
}

export async function GET(request: Request) {
  const isMeta = new URL(request.url).searchParams.get("platform") === "meta";
  const all = await getAllProducts();

  const items = all
    .filter((p) => !p.status || p.status === "available") // only things that can be bought
    .map((p) => itemXml(p, isMeta))
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>CharmChase — Antiques &amp; Vintage</title>
<link>${BASE_URL}</link>
<description>Antique and vintage furniture, jewellery, decor and art from Evesham, Worcestershire.</description>
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
