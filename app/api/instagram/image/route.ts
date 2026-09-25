import sharp from "sharp";
import { clampRatio, isAllowedImageUrl } from "@/lib/instagram";

// Converts a product photo into a JPEG Instagram accepts:
// 1080 px wide, aspect ratio between 4:5 and 1.91:1, white padding if needed.
//   /api/instagram/image?u=<photo url>&r=<width/height>
// Only our own photos (Supabase storage / charmchase.co.uk) are allowed.

export const runtime = "nodejs";
export const maxDuration = 30;

const WIDTH = 1080;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("u") || "";
  const ratio = clampRatio(Number(searchParams.get("r") || "0.8"));

  if (!isAllowedImageUrl(src)) return new Response("Not allowed", { status: 400 });

  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) return new Response("Photo not found", { status: 404 });
  const input = Buffer.from(await res.arrayBuffer());

  try {
    const out = await sharp(input)
      .rotate() // respect phone orientation
      .resize({
        width: WIDTH,
        height: Math.round(WIDTH / ratio),
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Could not convert photo", { status: 422 });
  }
}
