"use client";

import { useRef, useState } from "react";

// Items → 🎥 Video (update 111): upload your own video of an item; the site adds
// the hook, facts, price, CharmChase end card and music, then posts it as a Reel.

export type ClipInfo = {
  sound: "both" | "music" | "original";
  uploadedAt: string;
  status: "new" | "ready" | "posted";
  previewUrl: string | null;
  permalink: string | null;
  script: { hook: string; facts: string[] } | null;
};

const MAX_MB = 50;

const SOUNDS: { value: ClipInfo["sound"]; label: string }[] = [
  { value: "both", label: "My video's sound + quiet music" },
  { value: "music", label: "Music only" },
  { value: "original", label: "My video's sound only" },
];

async function act(action: string, extra: Record<string, unknown>) {
  const r = await fetch("/api/admin/reels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || (r.status === 504 ? "The server took too long — try a shorter video (up to 20 s, 1080p)." : "Failed"));
  return j;
}

export type TrackInfo = { name: string; mood: string; on: boolean };

function trackLabel(name: string) {
  return name.replace(/^\d+-/, "").replace(/\.(mp3|m4a|aac|wav)$/i, "");
}

function postMessage(j: { status?: string; error?: string; reason?: string }) {
  if (j.status === "posted") return "Posted to Instagram ✓";
  if (j.status === "sent" || j.status === "processing")
    return "Sent ✓ Instagram is processing it — it will appear within 15 minutes (you'll see it in Notifications).";
  return `Not posted: ${j.error || j.reason || j.status}`;
}

export default function ClipModal({
  item,
  clip,
  tracks = [],
  onClose,
  onChanged,
}: {
  item: { id: string; name: string };
  clip: ClipInfo | null;
  tracks?: TrackInfo[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [music, setMusic] = useState("auto");
  const fileRef = useRef<HTMLInputElement>(null);
  const [sound, setSound] = useState<ClipInfo["sound"]>(clip?.sound || "both");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(clip?.previewUrl || null);
  const [script, setScript] = useState(clip?.script || null);
  const [hasClip, setHasClip] = useState(Boolean(clip));
  const [posted, setPosted] = useState(clip?.status === "posted" ? clip.permalink || "" : null);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setMsg(`This video is ${(file.size / 1024 / 1024).toFixed(0)} MB — the limit is ${MAX_MB} MB. Film in 1080p (not 4K) and keep it under 20 seconds.`);
      return;
    }
    setBusy("upload");
    setMsg("Uploading…");
    try {
      const { url, path } = await act("clip-upload-url", { productId: item.id, filename: file.name });
      const up = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "video/mp4" } });
      if (!up.ok) throw new Error("Upload failed — check your connection and try again.");
      await act("clip-save", { productId: item.id, path, sound });
      setHasClip(true);
      setPreview(null);
      setPosted(null);
      onChanged();
      setMsg("Uploaded ✓ Now press “Make the Reel”.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changeSound(v: ClipInfo["sound"]) {
    setSound(v);
    if (!hasClip) return;
    try {
      await act("clip-sound", { productId: item.id, sound: v });
      setPreview(null);
      onChanged();
    } catch {
      /* keeps old */
    }
  }

  async function build() {
    setBusy("build");
    setMsg("Making the Reel… (up to a minute)");
    try {
      const j = await act("clip-preview", { productId: item.id, music });
      setPreview(j.videoUrl);
      setScript(j.script || null);
      setMsg("");
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function post() {
    if (!confirm("Post this Reel to Instagram now?")) return;
    setBusy("post");
    setMsg("Posting…");
    try {
      const j = await act("clip-post", { productId: item.id, music });
      if (j.status === "posted") setPosted(j.permalink || "");
      setMsg(postMessage(j));
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  // No video? A Reel from this item's photos instead.
  async function buildFromPhotos() {
    setBusy("photos");
    setMsg("Making a Reel from the photos… (up to a minute)");
    try {
      const j = await act("preview", { productId: item.id, music });
      setPreview(j.videoUrl);
      setScript(j.script || null);
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function postFromPhotos() {
    if (!confirm("Post a Reel made from this item's photos to Instagram now?")) return;
    setBusy("post");
    setMsg("Posting…");
    try {
      const j = await act("post-now", { productId: item.id, music });
      if (j.status === "posted") setPosted(j.permalink || "");
      setMsg(postMessage(j));
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!confirm("Remove this video?")) return;
    await act("clip-delete", { productId: item.id }).catch(() => {});
    setHasClip(false);
    setPreview(null);
    setPosted(null);
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 text-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">🎬 Instagram Reel</p>
            <p className="line-clamp-2 text-xs text-muted">{item.name}</p>
          </div>
          <button onClick={onClose} disabled={!!busy} className="text-xl leading-none text-muted" aria-label="Close">
            ×
          </button>
        </div>

        <p className="mt-3 text-xs text-muted">
          Film vertically, 10–20 seconds, 1080p (not 4K), turning the item slowly; 2–3 seconds close on the best detail.
          The site adds the hook, facts, price and CharmChase ending from this item&apos;s card.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/*"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="rounded-md border border-border-strong px-3 py-1.5 hover:border-ink disabled:opacity-50"
          >
            {busy === "upload" ? "Uploading…" : hasClip ? "Replace video" : "Upload video"}
          </button>
          {hasClip && (
            <button onClick={remove} disabled={!!busy} className="px-2 text-xs text-muted hover:text-ink">
              remove
            </button>
          )}
        </div>

        {hasClip && (
        <div className="mt-4">
            <p className="mb-1 font-medium">Sound</p>
            {SOUNDS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 py-0.5">
                <input type="radio" name="sound" checked={sound === s.value} onChange={() => changeSound(s.value)} disabled={!!busy} />
                {s.label}
              </label>
            ))}
          </div>
        )}

          <div className="mt-4">
            <p className="mb-1 font-medium">Music</p>
            <select
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              disabled={!!busy || sound === "original"}
              className="w-full rounded-md border border-border px-2 py-1.5"
            >
              <option value="auto">Auto (by item type)</option>
              <option value="calm">Calm</option>
              <option value="elegant">Elegant</option>
              <option value="lively">Lively</option>
              <option value="festive">Festive</option>
              {tracks.length > 0 && <option disabled>──────────</option>}
              {tracks.map((t) => (
                <option key={t.name} value={`track:${t.name}`}>
                  ♪ {trackLabel(t.name)} ({t.mood}){t.on ? "" : " — off"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Changed the music? Press “Make…” again before posting.</p>
          </div>

        {hasClip && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={build}
              disabled={!!busy}
              className="rounded-md border border-border-strong px-3 py-1.5 hover:border-ink disabled:opacity-50"
            >
              {busy === "build" ? "Making…" : preview ? "Make it again" : "Make the Reel"}
            </button>
            <button onClick={post} disabled={!!busy} className="rounded-md bg-ink px-3 py-1.5 text-white disabled:opacity-50">
              {busy === "post" ? "Posting…" : "Post to Instagram now"}
            </button>
          </div>
        )}
        {!hasClip && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted">No video yet? Make a Reel from this item&apos;s photos instead:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={buildFromPhotos}
                disabled={!!busy}
                className="rounded-md border border-border-strong px-3 py-1.5 hover:border-ink disabled:opacity-50"
              >
                {busy === "photos" ? "Making…" : "Reel from photos"}
              </button>
              <button onClick={postFromPhotos} disabled={!!busy} className="rounded-md bg-ink px-3 py-1.5 text-white disabled:opacity-50">
                {busy === "post" ? "Posting…" : "Post it to Instagram now"}
              </button>
            </div>
          </div>
        )}
        {hasClip && posted === null && (
          <p className="mt-2 text-xs text-muted">Not posted yet — nothing goes out until you press “Post”.</p>
        )}
        {posted !== null && (
          <p className="mt-2 text-xs text-green-700">
            Posted ✓{" "}
            {posted && (
              <a href={posted} target="_blank" rel="noreferrer" className="underline">
                open on Instagram
              </a>
            )}
          </p>
        )}

        {msg && <p className="mt-3">{msg}</p>}
        {preview && (
          <div className="mt-3">
            <video src={preview} controls playsInline className="max-h-[480px] rounded-md bg-black" />
            {script && (
              <p className="mt-1 text-xs text-muted">
                Hook: “{script.hook}” · {script.facts.join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
