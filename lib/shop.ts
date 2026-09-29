import type { Product } from "@/lib/products";

// Shared shop helpers (update 116).

export type ProductWithMeta = Product & { id?: string; created_at?: string };

export function isAvailable(p: Product) {
  return !p.status || p.status === "available";
}

/** Available pieces first (in the order given — newest first from the DB), sold/unavailable at the end. */
export function soldLast<T extends Product>(list: T[]): T[] {
  return [...list.filter(isAvailable), ...list.filter((p) => !isAvailable(p))];
}

export type SortKey = "newest" | "price-asc" | "price-desc";

export function parseSort(v?: string): SortKey {
  return v === "price-asc" || v === "price-desc" ? v : "newest";
}

/** Sorts the available pieces; sold ones always stay at the end (newest first). */
export function sortForListing<T extends Product>(list: T[], sort: SortKey = "newest"): T[] {
  const avail = list.filter(isAvailable);
  const gone = list.filter((p) => !isAvailable(p));
  if (sort === "price-asc") avail.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") avail.sort((a, b) => b.price - a.price);
  return [...avail, ...gone];
}

// Short all-caps tokens that should stay upper case after cleaning a title.
const KEEP_UPPER = new Set(["UK", "GB", "USA", "US", "WR", "MOP", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XL", "GR", "VR", "EPNS", "WWI", "WWII", "RAF", "DDR", "USSR", "LED", "TV", "HM", "CT"]);

/**
 * eBay-style ALL-CAPS titles ("ANTIQUE 17TH CENTURY TURKISH …") are shown in
 * normal case on the site. Titles that are already mixed case are untouched.
 * Only the display changes — the database and eBay keep the original.
 */
export function cleanTitle(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) return name;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (upper / letters.length < 0.8) return name;
  return name
    .split(/(\s+|[-/(),&])/)
    .map((w) => {
      if (!/[A-Za-z]/.test(w)) return w;
      if (KEEP_UPPER.has(w) && w !== "CT") return w;
      if (/^\d/.test(w)) return w.toLowerCase(); // 17TH → 17th, 18CT → 18ct, 925
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Items Google Shopping / Meta don't allow (endangered-species materials,
 * weapons and the like). They stay on the site and sell as normal — they are
 * only left out of the Merchant Center / Meta product feed (update 116), so
 * one item can't get the whole account suspended.
 */
export const FEED_RESTRICTED =
  /\b(ivory|tortoise ?shell|rhino|whalebone|whale bone|taxiderm\w*|stuffed|powder flask|gun ?powder|flintlock|musket|gun(?! ?metal)|guns|pistol|rifle|revolver|bayonet|sword|swords|sabre|dagger|daggers|machete|ammunition|bullets?|shell casing|trench art|tobacco|cigars?|cigarettes?)\b/i;

export function isFeedRestricted(p: Pick<Product, "name" | "description">) {
  return FEED_RESTRICTED.test(`${p.name} ${p.description || ""}`);
}

/**
 * Pulls a "Dimensions" block out of a free-text description so it can be
 * shown on its own (update 116). Returns null when there's nothing clear.
 */
export function extractDimensions(text: string): { label: string; value: string }[] | null {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^[\s•\-–*·]+/, "").trim());
  const out: { label: string; value: string }[] = [];
  const re = /^(height|width|depth|length|diameter|dia\.?|drop|size|ring size|case(?: size| diameter)?|weight|h|w|d|l)\b\s*(\([^)]*\))?\s*[:\-–]?\s*(.+\d.*)$/i;
  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    const value = m[3].trim();
    if (value.length > 60 || !/(cm|mm|in|inch|inches|"|g|kg|size)/i.test(value)) continue;
    const label = (m[1] + (m[2] ? ` ${m[2]}` : "")).replace(/^(h|w|d|l)$/i, (x) => ({ h: "Height", w: "Width", d: "Depth", l: "Length" } as Record<string, string>)[x.toLowerCase()]);
    out.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
    if (out.length >= 6) break;
  }
  return out.length >= 1 ? out : null;
}

/** Simple site search (update 117): every word must appear in the name, type, era or description. */
export function searchProducts<T extends Product>(list: T[], q: string): T[] {
  const words = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 8);
  if (!words.length) return [];
  const scored = list
    .map((p) => {
      const name = p.name.toLowerCase();
      const hay = `${name} ${p.subcategory || ""} ${p.era || ""} ${p.category} ${p.description || ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const score = words.reduce((s, w) => s + (name.includes(w) ? 2 : 1), 0) + (isAvailable(p) ? 10 : 0);
      return { p, score };
    })
    .filter((x): x is { p: T; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
}
