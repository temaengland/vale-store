import "server-only";
import { revalidateTag } from "next/cache";

// Update 180: call after any change to the products table so the public site
// shows it at once (the cached list otherwise refreshes every 30 minutes).
export function productsChanged() {
  try {
    revalidateTag("products");
  } catch {
    // outside a request (e.g. a script) — the 30-minute refresh covers it
  }
}
