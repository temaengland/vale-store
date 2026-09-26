"use client";

import { useEffect, useRef, useState } from "react";

// Admin → Items → "Daily Reel" (update 109).
type Data = {
  settings: { enabled: boolean; hour: number; trial: boolean };
  music: { name: string; url: string; mood: Mood; on: boolean }[];
  log: { at: string; kind: string; text: string; link?: string }[];
  pending: { name: string; since: string } | null;
  next: { id: string; name: string } | null;
  error?: string;
};

type Mood = "calm" | "elegant" | "lively" | "festive";
const MOOD_LABEL: Record<Mood, string> = { calm: "Calm", elegant: "Elegant", lively: "Lively", festive: "Festive" };

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00–22:00

function trackLabel(name: string) {
  return name.replace(/^\d+-/, "").replace(/\.(mp3|m4a|aac|wav)$/i, "");
}

export default function ReelsPanel() {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    seconds: number;
    track: string | null;
    script?: { hook: string; facts: string[] };
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  function togglePlay(url: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playing === url) {
      setPlaying(null);
      return;
    }
    const a = new Audio(url);
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audioRef.current = a;
    setPlaying(url);
  }

  async function load() {
    try {
      const r = await fetch("/api/admin/reels");
      setD(await r.json());
    } catch {
      /* optional */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const r = await fetch("/api/admin/reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  }

  async function saveSettings(patch: Partial<Data["settings"]>) {
    setBusy("settings");
    try {
      await act("settings", patch);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function uploadTracks(files: FileList | null) {
    if (!files?.length) return;
    setBusy("upload");
    setMsg("");
    try {
      for (const f of Array.from(files)) {
        if (f.size > 20 * 1024 * 1024) throw new Error(`${f.name} is larger than 20 MB.`);
        const { url } = await act("music-upload-url", { filename: f.name });
        const up = await fetch(url, { method: "PUT", body: f, headers: { "Content-Type": f.type || "audio/mpeg" } });
        if (!up.ok) throw new Error(`Upload failed for ${f.name}`);
      }
      setMsg("Music uploaded ✓");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function makePreview() {
    setBusy("preview");
    setMsg("Building the video… (up to a minute)");
    setPreview(null);
    try {
      const j = await act("preview", d?.next ? { productId: d.next.id } : {});
      setPreview({ url: j.videoUrl, name: j.name, seconds: j.seconds, track: j.track, script: j.script });
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function postNow() {
    if (!confirm(`Post a Reel to Instagram now${d?.next ? ` for “${d.next.name}”` : ""}?`)) return;
    setBusy("post");
    setMsg("Building and posting… (up to a minute)");
    try {
      const j = await act("post-now", d?.next ? { productId: d.next.id } : {});
      setMsg(
        j.status === "posted"
          ? "Reel posted ✓"
          : j.status === "sent" || j.status === "processing"
          ? "Sent ✓ Instagram is processing it — it will appear within 15 minutes (see Notifications)."
          : `Not posted: ${j.error || j.reason || j.status}`
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  if (!d || d.error) return null;
  const s = d.settings;
  const status = !s.enabled
    ? "you choose — press “Reel” next to an item"
    : !d.music.length
    ? "waiting for music — upload a track"
    : d.pending
    ? `processing “${d.pending.name}”`
    : `on ✓ — every day after ${s.hour}:00 (UK)`;

  return (
    <div className="mt-4 rounded-md border border-border text-xs">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span>
          🎬 Reels: <span className="text-muted">{status}</span>
        </span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-3 py-3">
          <p className="text-muted">
            Every day the site makes a short video from one item&apos;s photos (name, price, shop details, music) and posts
            it as a Reel. Items for sale that haven&apos;t had a Reel go first. Trial reels are shown to people who
            don&apos;t follow you yet — that&apos;s how new people find the shop.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.enabled}
                disabled={busy === "settings"}
                onChange={(e) => saveSettings({ enabled: e.target.checked })}
              />
              Also post automatically every day (off = only when I press Post)
            </label>
            <label className="flex items-center gap-2">
              after
              <select
                value={s.hour}
                disabled={busy === "settings"}
                onChange={(e) => saveSettings({ hour: Number(e.target.value) })}
                className="rounded border border-border px-1 py-0.5"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
              UK time
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.trial}
                disabled={busy === "settings"}
                onChange={(e) => saveSettings({ trial: e.target.checked })}
              />
              Trial reel (non-followers first)
            </label>
          </div>

          <div>
            <p className="mb-1 font-medium">
              Music ({d.music.filter((m) => m.on).length} on / {d.music.length})
            </p>
            <p className="mb-2 text-muted">
              ▶ listen · choose the mood · untick to stop using a track. “Auto” picks by item: jewellery & art →
              Elegant, watches → Lively, furniture & decor → Calm. Festive stays off until you tick it.
            </p>
            {d.music.map((m) => (
              <div key={m.name} className="flex flex-wrap items-center gap-2 border-b border-border py-1.5">
                <button
                  onClick={() => togglePlay(m.url)}
                  className="w-7 shrink-0 rounded border border-border text-center"
                  aria-label="Play"
                >
                  {playing === m.url ? "■" : "▶"}
                </button>
                <input
                  type="checkbox"
                  checked={m.on}
                  onChange={async (e) => {
                    await act("music-set", { name: m.name, on: e.target.checked }).catch(() => {});
                    load();
                  }}
                />
                <span className={`min-w-0 flex-1 truncate ${m.on ? "" : "text-muted line-through"}`}>{trackLabel(m.name)}</span>
                <select
                  value={m.mood}
                  onChange={async (e) => {
                    await act("music-set", { name: m.name, mood: e.target.value }).catch(() => {});
                    load();
                  }}
                  className="rounded border border-border px-1 py-0.5"
                >
                  {(Object.keys(MOOD_LABEL) as Mood[]).map((k) => (
                    <option key={k} value={k}>
                      {MOOD_LABEL[k]}
                    </option>
                  ))}
                </select>
                <button
                  className="text-muted hover:text-ink"
                  onClick={async () => {
                    if (!confirm("Remove this track?")) return;
                    await act("music-delete", { name: m.name }).catch(() => {});
                    load();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,.mp3,.m4a"
              multiple
              className="hidden"
              onChange={(e) => uploadTracks(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy === "upload"}
              className="mt-1 rounded-md border border-border-strong px-3 py-1 hover:border-ink disabled:opacity-50"
            >
              {busy === "upload" ? "Uploading…" : "Upload music (MP3)"}
            </button>
          </div>

          <div>
            <p className="mb-1 font-medium">Next item: {d.next ? d.next.name : "—"}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={makePreview}
                disabled={!!busy || !d.next}
                className="rounded-md border border-border-strong px-3 py-1 hover:border-ink disabled:opacity-50"
              >
                {busy === "preview" ? "Building…" : "Preview video"}
              </button>
              <button
                onClick={postNow}
                disabled={!!busy || !d.next}
                className="rounded-md bg-ink px-3 py-1 text-white disabled:opacity-50"
              >
                {busy === "post" ? "Posting…" : "Post a Reel now"}
              </button>
            </div>
          </div>

          {msg && <p>{msg}</p>}
          {preview && (
            <div>
              <video src={preview.url} controls playsInline className="max-h-[480px] rounded-md bg-black" />
              <p className="mt-1 text-muted">
                {preview.name} · {preview.seconds}s{preview.track ? ` · ♪ ${trackLabel(preview.track)}` : " · no music"}
              </p>
              {preview.script && (
                <p className="mt-1">
                  Hook: “{preview.script.hook}” · {preview.script.facts.join(" · ")}
                </p>
              )}
            </div>
          )}

          {d.log.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Recent</p>
              {d.log.map((e, i) => (
                <p key={i} className="line-clamp-2">
                  {e.kind === "posted" ? "✓" : e.kind === "error" ? "✗" : "·"}{" "}
                  {new Date(e.at).toLocaleDateString("en-GB")} — {e.text}{" "}
                  {e.link && (
                    <a href={e.link} target="_blank" rel="noreferrer" className="underline">
                      open
                    </a>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
