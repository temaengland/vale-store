// Builds a ready-to-post Instagram caption for an item. Used in the admin
// "Post to Instagram" window, where it can still be edited before posting.

type CaptionItem = {
  name: string;
  description?: string;
  price: number; // pence
  category: "furniture" | "jewelry" | "decor" | "art";
  subcategory?: string;
  era?: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
};

// Instagram now treats 20–30 hashtags as spam — keep 5 precise ones.
const CATEGORY_TAGS: Record<CaptionItem["category"], [string, string]> = {
  furniture: ["antiquefurniture", "vintagefurniture"],
  jewelry: ["antiquejewellery", "vintagejewellery"],
  decor: ["antiquedecor", "vintagedecor"],
  art: ["antiqueart", "vintageart"],
};
const MAX_TAGS = 5;

// Phrases left over from eBay listings that make no sense on Instagram.
const EBAY_LINE = /(bidding|before you bid|before buying|please message|message me|ask any questions|feel free to ask|ebay)/i;

function tag(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanDescription(text: string) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !EBAY_LINE.test(l));
  let out = lines.join("\n\n");
  if (out.length > 1200) out = out.slice(0, 1200).replace(/\s+\S*$/, "") + "…";
  return out;
}

function formatPrice(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function buildInstagramCaption(p: CaptionItem) {
  // Price goes in the first line — it's the only line visible in the feed.
  const parts: string[] = [`${p.name.trim()} · ${formatPrice(p.price)}`];

  const desc = cleanDescription(p.description || "");
  if (desc && desc.toLowerCase() !== p.name.trim().toLowerCase()) parts.push(desc);

  const facts: string[] = [];
  if (p.era) facts.push(`🕰 Era: ${p.era}`);
  const dims = [p.length_cm, p.width_cm, p.height_cm].filter((d) => d && d > 0);
  if (dims.length) facts.push(`📏 Size: ${dims.join(" × ")} cm`);
  facts.push(`💷 ${formatPrice(p.price)}`);
  parts.push(facts.join("\n"));

  parts.push(
    [
      "🛒 Shop online: charmchase.co.uk (link in bio)",
      "📍 Visit us: 51 High Street, Evesham WR11 4DA",
      "📦 UK delivery available — DM us with any questions",
    ].join("\n")
  );

  // charmchase · 2 category tags · era (or #antiques) · evesham
  const tags = [
    "charmchase",
    ...CATEGORY_TAGS[p.category],
    p.era ? tag(p.era) : "antiques",
    "evesham",
  ];
  const unique = Array.from(new Set(tags.filter(Boolean))).slice(0, MAX_TAGS);
  parts.push(unique.map((t) => `#${t}`).join(" "));

  return parts.join("\n\n");
}
