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

export async function getAllProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return data as Product[];
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
