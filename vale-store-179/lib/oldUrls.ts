import { getAllProducts } from "@/lib/data";

// Update 149: the old Shopify shop used /products/... and /collections/...
// Google still has ~60 of those links (404 in Search Console). Each old link
// now sends people (and Google) to the closest page on the new site.

const STOP = new Set(["the", "and", "with", "for", "of", "a", "in", "copy", "vintage", "antique", "1st", "quality"]);

function words(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const CAT_WORDS: [string, RegExp][] = [
  ["watches", /watch|rolex|omega|cartier|seiko|clock/],
  ["jewelry", /ring|necklace|pearl|brooch|earring|bracelet|pendant|medallion|jewel|gold|diamond|locket|chain|cameo/],
  ["silver", /silver|sterling|cutlery|spoon|tray|candlestick/],
  ["ceramics", /porcelain|ceramic|china|vase|bowl|jar|imari|derby|copenhagen|canton|plate|pottery|teapot|figurine|glass/],
  ["furniture", /chair|table|cabinet|desk|chest|drawer|stool|sideboard|mirror|lamp|furniture|bench/],
  ["art", /painting|print|art|sculpture|driftwood|frame|oil|watercolou?r|decor|camera|card|collect|curio/],
];

export function categoryFor(text: string): string | null {
  const t = text.toLowerCase().replace(/-/g, " ");
  for (const [cat, re] of CAT_WORDS) if (re.test(t)) return cat;
  return null;
}

export async function bestProductUrl(oldSlug: string): Promise<string> {
  const want = words(oldSlug);
  const all = await getAllProducts();
  const exact = all.find((p) => p.slug === oldSlug);
  if (exact) return `/product/${exact.slug}`;
  let best: { slug: string; score: number } | null = null;
  for (const p of all) {
    const have = new Set(words(`${p.name} ${p.slug}`));
    const score = want.filter((w) => have.has(w)).length;
    if (!best || score > best.score) best = { slug: p.slug, score };
  }
  if (best && want.length && best.score >= Math.max(3, Math.ceil(want.length * 0.6))) return `/product/${best.slug}`;
  const cat = categoryFor(oldSlug);
  return cat ? `/category/${cat}` : "/new";
}
