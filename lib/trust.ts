import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { trading, userAccessToken } from "@/lib/ebay";

// Update 147: real reviews shown on the site.
// eBay: feedback score + % positive, read from eBay once a day (GetUser).
// Google: rating of the shop's Google Business Profile (update by hand here).

// Update 148: Google rating hidden for now (Artem is collecting more reviews) — set to true to show it again.
export const SHOW_GOOGLE_RATING = false;

export const GOOGLE_REVIEWS = {
  rating: 4.6,
  count: 10,
  url: "https://www.google.com/maps/search/?api=1&query=Charm%20Chase%20Antiques%20%26%20Vintage%20Shop%2C%2051%20High%20St%2C%20Evesham",
  quotes: [
    { text: "Fantastic little treasure trove in the heart of Evesham… the owner was knowledgeable and helpful.", name: "Monika Z" },
    { text: "Charming space, lots of interesting antiques in a variety of styles to suit every taste. What a gem!", name: "Lisa R" },
    { text: "A small but well stocked, cute local antique store. The gentleman serving us was very polite and helpful.", name: "Mr G" },
  ],
};

export const SHOP = {
  address: "51 High Street, Evesham WR11 4DA",
  photos: {
    front: "https://hbmfkrrjxlpamzgozzmh.supabase.co/storage/v1/object/public/product-images/1793281118778-shop-front.jpg",
    inside: "https://hbmfkrrjxlpamzgozzmh.supabase.co/storage/v1/object/public/product-images/1793281120020-shop-inside.jpg",
    jewellery: "https://hbmfkrrjxlpamzgozzmh.supabase.co/storage/v1/object/public/product-images/1793281121493-shop-jewellery.jpg",
  },
};

export type Trust = {
  google: { rating: number; count: number; url: string; show: boolean };
  ebay: { score: number; positive: number; user: string; url: string } | null;
};

const KEY = "trust_ebay";

export async function getTrust(): Promise<Trust> {
  const google = { rating: GOOGLE_REVIEWS.rating, count: GOOGLE_REVIEWS.count, url: GOOGLE_REVIEWS.url, show: SHOW_GOOGLE_RATING };
  let ebay: Trust["ebay"] = null;
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("app_settings").select("value, updated_at").eq("key", KEY).maybeSingle();
    const fresh = data && Date.now() - new Date(data.updated_at).getTime() < 24 * 3600 * 1000;
    if (data) ebay = JSON.parse(data.value);
    if (!fresh) {
      const r = await trading("GetUser", "<DetailLevel>ReturnAll</DetailLevel>", await userAccessToken());
      const u = r.User || {};
      const user = String(u.UserID || "");
      const next = {
        score: Number(u.FeedbackScore || 0),
        positive: Number(u.PositiveFeedbackPercent || 0),
        user,
        url: user ? `https://www.ebay.co.uk/fdbk/feedback_profile/${encodeURIComponent(user)}` : "https://www.ebay.co.uk",
      };
      if (next.score > 0) {
        ebay = next;
        await db.from("app_settings").upsert({ key: KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() });
      }
    }
  } catch {
    /* reviews are a nice-to-have — never break the page */
  }
  return { google, ebay };
}
