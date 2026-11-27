import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function trackProductView(slug: string) {
  try {
    await supabaseAdmin().rpc("increment_product_view", { p_slug: slug });
  } catch {
    // Best-effort only — a tracking hiccup should never affect the page.
  }
}

export async function trackCategoryView(category: string) {
  try {
    await supabaseAdmin().rpc("increment_category_view", {
      p_category: category,
    });
  } catch {
    // Best-effort only — a tracking hiccup should never affect the page.
  }
}
