import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  categories,
  products as seedProducts,
  Product,
  getCategory as getSeedCategory,
} from "@/lib/products";

// Every function here checks Supabase first and falls back to the seed
// data in lib/products.ts if Supabase isn't set up yet. This means the
// site works out of the box, and starts showing real admin-managed
// products automatically the moment Supabase env vars are added — no
// other code needs to change.

// Columns safe to expose to visitors. cost_price is deliberately excluded —
// it's business-sensitive and only ever fetched via the admin API routes,
// which use the service role key on the server, never the public anon key.
const PUBLIC_PRODUCT_COLUMNS =
  "id, slug, name, price, category, subcategory, era, description, image, images, icon, status, shipping_cost, created_at";

export async function getAllProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(PUBLIC_PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });
    if (!error && data) return data as unknown as Product[];
  }
  return seedProducts;
}

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
