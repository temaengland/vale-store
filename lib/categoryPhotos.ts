import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Product } from "@/lib/products";
import { isAvailable } from "@/lib/shop";

// Update 118: each category tile on the homepage shows a photo of a real
// piece. Admin → Items → "Cat. photo" picks it; otherwise the newest piece
// in stock with a photo is used.
const KEY = "category_photos";

export async function getCategoryPhotoMap(): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseAdmin().from("app_settings").select("value").eq("key", KEY).maybeSingle();
    return data ? (JSON.parse(data.value) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function setCategoryPhoto(category: string, productId: string | null) {
  const map = await getCategoryPhotoMap();
  if (productId) map[category] = productId;
  else delete map[category];
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({ key: KEY, value: JSON.stringify(map), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return map;
}

// Update 119: Artem's chosen defaults (used until he picks another item in
// Admin → Items → "Cat. photo"): Regency card table, five-stone diamond ring,
// Georgian 1791 salver, Murano vase, José Palmeiro painting.
const DEFAULT_PHOTO_FILES: Record<string, string> = {
  furniture: "ebay-800394913295-1.jpg",
  jewelry: "1788373263770-photo.jpg",
  watches: "ebay-800388292559-1.jpg", // H Samuel pocket watch (121)
  silver: "1788465143196-photo.jpg",
  ceramics: "ebay-800728523911-1.jpg", // Meissen tazza (121)
  art: "1788616077061-photo.jpg",
};

function coverOf(p: Product) {
  return (p.images && p.images[0]) || p.image || null;
}

/** Photo URL per category slug (null when the category has nothing with a photo). */
export async function resolveCategoryPhotos(products: Product[], slugs: string[]) {
  const map = await getCategoryPhotoMap();
  const out: Record<string, string | null> = {};
  for (const slug of slugs) {
    const chosen = products.find((p) => p.id && p.id === map[slug] && isAvailable(p) && coverOf(p));
    const file = DEFAULT_PHOTO_FILES[slug];
    const preset = file ? products.find((p) => isAvailable(p) && coverOf(p)?.endsWith(`/${file}`)) : undefined;
    const fallback = products.find((p) => p.category === slug && isAvailable(p) && coverOf(p));
    const pick = chosen || preset || fallback;
    out[slug] = pick ? coverOf(pick) : null;
  }
  return out;
}
