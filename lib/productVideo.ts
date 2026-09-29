import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Update 117: the Reel shown on an item's page — your own video once it has
// been posted to Instagram, otherwise a posted photo-Reel. Kept separate from
// lib/reels.ts so product pages don't load the video-making code.
const BUCKET = "media";

export async function productVideo(productId?: string): Promise<{ url: string; poster: string | null } | null> {
  if (!productId) return null;
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("app_settings")
      .select("key, value")
      .in("key", [`reel_video:${productId}`, `reel:${productId}`]);
    const get = (k: string) => {
      const row = (data || []).find((r) => r.key === k);
      try {
        return row ? JSON.parse(row.value) : null;
      } catch {
        return null;
      }
    };
    const pub = (path: string) => db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const clip = get(`reel_video:${productId}`) as { posted?: unknown; built?: { videoPath?: string; coverPath?: string } } | null;
    if (clip?.posted && clip.built?.videoPath) {
      return { url: pub(clip.built.videoPath), poster: clip.built.coverPath ? pub(clip.built.coverPath) : null };
    }
    const reel = get(`reel:${productId}`) as { video?: string } | null;
    if (reel?.video && /\.mp4$/.test(reel.video)) {
      return { url: pub(reel.video), poster: pub(reel.video.replace(/\.mp4$/, ".jpg")) };
    }
  } catch {
    /* no video */
  }
  return null;
}
