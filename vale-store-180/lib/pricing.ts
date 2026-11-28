import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Update 148 — CharmChase pricing rule (agreed with Artem, Oct 2026):
//   eBay price is the reference.
//   Site  = eBay − 10%   (set automatically when an item is imported from eBay)
//   Etsy  = eBay price   (set automatically when an item is sent to Etsy)
// The eBay price of each item is kept in app_settings "ebay_prices".

export const SITE_DISCOUNT = 10; // %
const KEY = "ebay_prices";

/** eBay price → site price: −10%, whole pounds under £100, £5 steps above. */
export function sitePriceFromEbay(ebayPence: number) {
  const pounds = (ebayPence / 100) * (1 - SITE_DISCOUNT / 100);
  const r = pounds < 100 ? Math.round(pounds) : Math.round(pounds / 5) * 5;
  return Math.max(1, r) * 100;
}

/** Site price → Etsy price when the eBay price isn't known (reverse of the 10%). */
function etsyFromSite(sitePence: number) {
  const pounds = sitePence / 100 / (1 - SITE_DISCOUNT / 100);
  const r = pounds < 100 ? Math.round(pounds) : Math.round(pounds / 5) * 5;
  return r * 100;
}

export async function ebayPrices() {
  try {
    const { data } = await supabaseAdmin().from("app_settings").select("value").eq("key", KEY).maybeSingle();
    return data ? (JSON.parse(data.value) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function saveEbayPrices(patch: Record<string, number>) {
  const all = { ...(await ebayPrices()), ...patch };
  await supabaseAdmin().from("app_settings").upsert({ key: KEY, value: JSON.stringify(all), updated_at: new Date().toISOString() });
}

/** Etsy price for an item: its eBay price, otherwise site price + the 10% back. */
export async function etsyPriceFor(productId: string, sitePence: number, known?: Record<string, number>) {
  const map = known || (await ebayPrices());
  const ebay = map[productId];
  // Use the eBay price only if it still matches the site price (site may have been edited by hand).
  if (ebay && sitePriceFromEbay(ebay) === sitePence) return ebay;
  return etsyFromSite(sitePence);
}
