// Update 180: product photos are served through our own /img/... address
// (Vercel's CDN keeps a copy) instead of straight from Supabase Storage, so
// visitors, Google Shopping and Meta re-reading photos no longer use the
// Supabase free egress allowance. Files stay in Supabase exactly as before.
const SUPABASE_PUBLIC = "https://hbmfkrrjxlpamzgozzmh.supabase.co/storage/v1/object/public/";

export function cdnUrl<T extends string | null | undefined>(u: T): T {
  if (typeof u !== "string" || !u.startsWith(SUPABASE_PUBLIC)) return u;
  return ("/img/" + u.slice(SUPABASE_PUBLIC.length)) as T;
}

export const SUPABASE_PUBLIC_BASE = SUPABASE_PUBLIC;
