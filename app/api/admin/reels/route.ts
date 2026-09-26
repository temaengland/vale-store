import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import {
  clipUploadUrl,
  deleteClip,
  deleteMusic,
  listClips,
  listReeled,
  previewClipReel,
  publicUrl,
  saveClip,
  setClipSound,
  getPending,
  getSettings,
  listMusic,
  musicUploadUrl,
  nextCandidate,
  previewReel,
  readLog,
  reelTick,
  saveSettings,
} from "@/lib/reels";

// Admin → Items → "Daily Reel" (update 109).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [settings, music, log, pending, next, clipRecs, reeled] = await Promise.all([
      getSettings(),
      listMusic(),
      readLog(),
      getPending(),
      nextCandidate(),
      listClips(),
      listReeled(),
    ]);
    const clips = Object.fromEntries(
      Object.entries(clipRecs).map(([id, c]) => [
        id,
        {
          sound: c.sound,
          uploadedAt: c.uploadedAt,
          status: c.posted ? "posted" : c.built ? "ready" : "new",
          previewUrl: c.built ? publicUrl(c.built.videoPath) : null,
          permalink: c.posted?.permalink || null,
          script: c.built?.script || null,
        },
      ])
    );
    return NextResponse.json({
      settings,
      music,
      log: log.slice(0, 10),
      pending: pending ? { name: pending.name, since: pending.createdAt } : null,
      next: next ? { id: next.id, name: next.name } : null,
      clips,
      reeled,
    });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      enabled?: boolean;
      hour?: number;
      trial?: boolean;
      productId?: string;
      filename?: string;
      name?: string;
      path?: string;
      sound?: "both" | "music" | "original";
    };
    const sound = body.sound === "music" || body.sound === "original" ? body.sound : "both";
    switch (body.action) {
      case "settings":
        return NextResponse.json({
          settings: await saveSettings({
            ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
            ...(typeof body.hour === "number" ? { hour: body.hour } : {}),
            ...(typeof body.trial === "boolean" ? { trial: body.trial } : {}),
          }),
        });
      case "preview":
        return NextResponse.json(await previewReel(body.productId || undefined));
      case "post-now":
        return NextResponse.json(await reelTick({ force: true, productId: body.productId || undefined }));
      case "music-upload-url":
        return NextResponse.json({ url: await musicUploadUrl(String(body.filename || "track.mp3")) });
      case "music-delete":
        await deleteMusic(String(body.name || ""));
        return NextResponse.json({ ok: true });
      // ----- your own video for an item (update 111) -----
      case "clip-upload-url":
        if (!body.productId) throw new Error("Missing item.");
        return NextResponse.json(await clipUploadUrl(body.productId, String(body.filename || "video.mp4")));
      case "clip-save":
        if (!body.productId || !body.path) throw new Error("Missing item or file.");
        return NextResponse.json({ clip: await saveClip(body.productId, body.path, sound) });
      case "clip-sound":
        if (!body.productId) throw new Error("Missing item.");
        return NextResponse.json({ clip: await setClipSound(body.productId, sound) });
      case "clip-preview":
        if (!body.productId) throw new Error("Missing item.");
        return NextResponse.json(await previewClipReel(body.productId));
      case "clip-post":
        if (!body.productId) throw new Error("Missing item.");
        return NextResponse.json(await reelTick({ force: true, productId: body.productId }));
      case "clip-delete":
        if (!body.productId) throw new Error("Missing item.");
        await deleteClip(body.productId);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
