import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  categories,
  products as seedProducts,
  Product,
  getCategory as getSeedCategory,
} from "@/lib/products";
import { cleanTitle } from "@/lib/shop";
import { cdnUrl } from "@/lib/cdn";

// Every function here checks Supabase first and falls back to the seed
// data in lib/products.ts if Supabase isn't set up yet. This means the
// site works out of the box, and starts showing real admin-managed
// products automatically the moment Supabase env vars are added — no
// other code needs to change.

// Columns safe to expose to visitors. cost_price is deliberately excluded —
// it's business-sensitive and only ever fetched via the admin API routes,
// which use the service role key on the server, never the public anon key.
const PUBLIC_PRODUCT_COLUMNS =
  "id, slug, name, price, category, subcategory, era, description, image, images, icon, status, shipping_cost, international_shipping_cost, weight_grams, length_cm, width_cm, height_cm, created_at, ebay_item_id";

// Update 180: the full product list used to be downloaded from Supabase on
// EVERY page view (and every live-search keystroke) — ~0.4 MB each time, which
// pushed us over the free 5 GB egress. Now it is kept in Vercel's data cache
// for 30 minutes and refreshed straight away whenever an item is added,
// edited, sold or deleted (revalidateTag("products") — see lib/productsCache.ts).
// Checkout still reads fresh data so a sold item can never be bought twice.
export async function getAllProductsFresh(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq("is_draft", false)
      .order("created_at", { ascending: false });
    // ALL-CAPS eBay titles are shown in normal case (update 116).
    if (!error && data) return (data as unknown as Product[]).map((p) => ({ ...p, name: cleanTitle(p.name) }));
  }
  return seedProducts;
}

// Photos point at our own /img/... copies (update 180, lib/cdn.ts). Checkout keeps
// the original Supabase links (Stripe needs a full address).
async function getAllProductsForSite(): Promise<Product[]> {
  const all = await getAllProductsFresh();
  return all.map((p) => ({
    ...p,
    image: cdnUrl(p.image),
    images: Array.isArray(p.images) ? p.images.map((u) => cdnUrl(u)) : p.images,
  }));
}

export const getAllProducts: () => Promise<Product[]> = unstable_cache(
  getAllProductsForSite,
  ["all-products-v1"],
  { revalidate: 1800, tags: ["products"] }
);

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.category === slug);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug);
}

export function getAllCategories() {
  return categories;
}

export function getCategory(slug: string) {
  return getSeedCategory(slug);
}
