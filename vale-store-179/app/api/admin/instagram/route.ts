import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  absoluteImageUrl,
  clampRatio,
  getAccount,
  getToken,
  instagramImageUrl,
  isAllowedImageUrl,
  isConfigured,
  listPosted,
  publishPhotos,
  savePosted,
} from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

// GET — connection status + which items were already posted.
export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured())
    return NextResponse.json({
      configured: false,
      error: "Instagram isn't connected — add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in Vercel.",
      posted: {},
    });
  try {
    const t = await getToken();
    const account = await getAccount(t.token);
    const posted = await listPosted();
    return NextResponse.json({
      configured: true,
      username: account.username,
      autoRenew: t.canStore,
      posted,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: errMsg(e), posted: await listPosted() });
  }
}

// POST { productId, caption } — publish the item's photos to Instagram.
export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured())
    return NextResponse.json({ error: "Instagram isn't connected yet." }, { status: 400 });

  try {
    const { productId, caption } = (await req.json()) as { productId?: string; caption?: string };
    if (!productId) return NextResponse.json({ error: "Missing item." }, { status: 400 });
    const text = String(caption || "").trim();
    if (text.length > 2200)
      return NextResponse.json({ error: "Caption is longer than 2,200 characters." }, { status: 400 });
    if ((text.match(/#[^\s#]+/g) || []).length > 30)
      return NextResponse.json({ error: "Instagram allows at most 30 hashtags." }, { status: 400 });

    const { data: product, error } = await supabaseAdmin()
      .from("products")
      .select("id, images, image")
      .eq("id", productId)
      .single();
    if (error || !product) return NextResponse.json({ error: "Item not found." }, { status: 404 });

    const photos: string[] = (
      product.images && product.images.length ? product.images : product.image ? [product.image] : []
    )
      .map((u: string) => absoluteImageUrl(u))
      .filter(isAllowedImageUrl)
      .slice(0, 10);
    if (!photos.length) return NextResponse.json({ error: "This item has no photos." }, { status: 400 });

    // All photos in a carousel share the first photo's shape (kept within 4:5 – 1.91:1).
    let ratio = 0.8;
    try {
      const first = Buffer.from(await (await fetch(photos[0], { cache: "no-store" })).arrayBuffer());
      const meta = await sharp(first).metadata();
      if (meta.width && meta.height) {
        const swap = (meta.orientation ?? 1) >= 5;
        ratio = clampRatio(swap ? meta.height / meta.width : meta.width / meta.height);
      }
    } catch {
      /* default 4:5 */
    }

    const t = await getToken();
    const result = await publishPhotos(
      photos.map((u) => instagramImageUrl(u, ratio)),
      text,
      t.token
    );
    const info = { mediaId: result.mediaId, permalink: result.permalink, at: new Date().toISOString() };
    await savePosted(productId, info);
    return NextResponse.json({ ok: true, ...info });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
