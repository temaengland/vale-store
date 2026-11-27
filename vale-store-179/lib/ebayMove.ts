import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { allActiveListings, getConnection, getItemRaw, userAccessToken } from "@/lib/ebay";
import { words, similarity } from "@/lib/ebaySync";

// Update 167: old eBay account → DRAFTS file for the new account.
// eBay doesn't allow Simple Delivery via the API (private sellers), so instead the site
// builds a file for Seller Hub → Reports → Uploads ("Create drafts" template).
// Artem uploads it on pl.ten_60, every item lands in Drafts, he picks delivery and lists.
// Nothing is listed or ended by the site.

export async function oldAccountStatus() {
  const c = await getConnection("old").catch(() => null);
  return { connected: Boolean(c), connectedAt: c?.connectedAt || null };
}

export type OldListing = { itemId: string; title: string; duplicateOf: string | null };

function bestMatch(title: string, pool: { name: string; w: Set<string> }[]) {
  const w = words(title);
  if (w.size < 3) return null;
  let best: { name: string; score: number } | null = null;
  for (const p of pool) {
    if (p.w.size < 3) continue;
    const score = similarity(w, p.w);
    if (!best || score > best.score) best = { name: p.name, score };
  }
  return best && best.score >= 0.75 ? best.name : null;
}

/** Live listings on the old account, each marked if it's already on the site or the new eBay. */
export async function oldListings(): Promise<OldListing[]> {
  const oldToken = await userAccessToken("old");
  const mainToken = await userAccessToken("main");
  const [olds, mains] = await Promise.all([allActiveListings(oldToken), allActiveListings(mainToken)]);
  const { data } = await supabaseAdmin().from("products").select("name, status").neq("status", "sold");
  const names = (data || []).map((p: { name: string }) => p.name);
  const pool = [
    ...names.map((n) => ({ name: `site: ${n}`, w: words(n) })),
    ...mains.map((m) => ({ name: `new eBay: ${m.title}`, w: words(m.title) })),
  ];
  const exact = new Set([...names, ...mains.map((m) => m.title)].map((t) => t.toLowerCase().trim()));
  return olds.map((o) => ({
    itemId: o.itemId,
    title: o.title,
    duplicateOf: exact.has(o.title.toLowerCase().trim()) ? "same title" : bestMatch(o.title, pool),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const text = (v: Raw): string => (v && typeof v === "object" && "#text" in v ? String(v["#text"]) : String(v ?? ""));

export type DraftRow = {
  sku: string;
  categoryId: string;
  title: string;
  price: string;
  photos: string; // "|"-separated, max 12
  conditionId: string;
  description: string;
  specifics: Record<string, string>; // update 169: Brand, Material, Type… → "C:" columns
};

/** Item specifics of an old listing (multiple values joined with "|", eBay's file format). */
function specificsOf(it: Raw): Record<string, string> {
  const out: Record<string, string> = {};
  const list = it?.ItemSpecifics?.NameValueList || [];
  for (const n of Array.isArray(list) ? list : [list]) {
    const name = text(n?.Name).trim();
    if (!name || name.length > 60) continue;
    const vals = (Array.isArray(n.Value) ? n.Value : [n.Value]).map((v: Raw) => text(v).trim()).filter(Boolean);
    if (vals.length) out[name] = vals.join("|").slice(0, 300);
  }
  return out;
}

/** Full details of a few old listings, ready for the drafts file. */
export async function draftRows(itemIds: string[]) {
  const token = await userAccessToken("old");
  const rows: DraftRow[] = [];
  const errors: { itemId: string; error: string }[] = [];
  for (const id of itemIds) {
    try {
      const it = await getItemRaw(token, id);
      const price =
        Number(text(it.StartPrice)) || Number(text(it.BuyItNowPrice)) || Number(text(it.SellingStatus?.CurrentPrice)) || 0;
      const pics: string[] = (it.PictureDetails?.PictureURL || [])
        .map((u: Raw) => text(u).replace(/s-l\d+\./, "s-l1600.").replace(/\$_\d+\.(JPG|PNG|jpg|png)(\?.*)?$/, "$_57.$1"))
        .filter((u: string) => u.startsWith("https://"))
        .slice(0, 12);
      rows.push({
        sku: `OLD-${id}`,
        categoryId: text(it.PrimaryCategory?.CategoryID),
        title: text(it.Title).slice(0, 80),
        price: price ? price.toFixed(2) : "",
        photos: pics.join("|"),
        // Update 168: the drafts template wants a condition word, not eBay's number.
        conditionId: ["1000", "1500", "1750"].includes(text(it.ConditionID)) ? "NEW" : "USED",
        description: text(it.Description),
        specifics: specificsOf(it),
      });
    } catch (e) {
      errors.push({ itemId: id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { rows, errors };
}
