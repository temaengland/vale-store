import { SUPABASE_PUBLIC_BASE } from "@/lib/cdn";

// Update 180: /img/<bucket>/<file> → the same file in Supabase Storage.
// Vercel's CDN caches the answer for 30 days, so Supabase is asked for each
// photo only once in a while instead of on every view.
export const dynamic = "force-dynamic";

const BUCKETS = new Set(["product-images", "media"]);

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const parts = params.path || [];
  if (parts.length < 2 || !BUCKETS.has(parts[0]) || parts.some((p) => p === ".." || p === "")) {
    return new Response("Not found", { status: 404 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(SUPABASE_PUBLIC_BASE + parts.map(encodeURIComponent).join("/"), { cache: "no-store" });
  } catch {
    return new Response("Temporarily unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}
