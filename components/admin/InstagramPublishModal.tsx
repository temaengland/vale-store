"use client";

import { useState } from "react";
import { buildInstagramCaption } from "@/lib/instagramCaption";

export type InstagramItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "furniture" | "jewelry" | "decor" | "art";
  subcategory?: string;
  era?: string;
  image?: string;
  images?: string[];
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
};

export type PostedInfo = { mediaId: string; permalink?: string; at: string };

export default function InstagramPublishModal({
  item,
  username,
  posted,
  onClose,
  onPublished,
}: {
  item: InstagramItem;
  username?: string;
  posted?: PostedInfo;
  onClose: () => void;
  onPublished: (info: PostedInfo) => void;
}) {
  const photos = (item.images && item.images.length ? item.images : item.image ? [item.image] : []).slice(0, 10);
  const totalPhotos = item.images?.length ?? (item.image ? 1 : 0);
  const [caption, setCaption] = useState(() => buildInstagramCaption(item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<PostedInfo | null>(null);

  const hashtags = (caption.match(/#[^\s#]+/g) || []).length;
  const tooLong = caption.length > 2200;
  const tooManyTags = hashtags > 30;

  async function publish() {
    if (posted && !confirm("This item is already on Instagram. Post it again?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.id, caption }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Publishing failed.");
      const info = { mediaId: data.mediaId, permalink: data.permalink, at: data.at };
      setDone(info);
      onPublished(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Post to Instagram</h2>
            <p className="text-xs text-muted">
              {username ? `@${username}` : "Instagram"} · {photos.length} photo{photos.length === 1 ? "" : "s"}
              {totalPhotos > 10 && " (Instagram allows 10 — the first 10 are used)"}
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-xl leading-none text-muted" aria-label="Close">
            ×
          </button>
        </div>

        {done ? (
          <div className="mt-6 space-y-4 text-sm">
            <p className="rounded-md bg-green-50 px-3 py-2 text-green-800">Posted to Instagram ✓</p>
            {done.permalink && (
              <a href={done.permalink} target="_blank" rel="noreferrer" className="block underline">
                Open the post
              </a>
            )}
            <button onClick={onClose} className="rounded-md bg-ink px-5 py-2 text-white">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
              ))}
            </div>

            <label className="mt-4 block text-xs text-muted">Caption — edit anything before posting</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm"
            />
            <p className={`mt-1 text-xs ${tooLong || tooManyTags ? "text-red-600" : "text-muted"}`}>
              {caption.length}/2200 characters · {hashtags}/30 hashtags
            </p>

            {posted && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Already posted on {new Date(posted.at).toLocaleDateString("en-GB")}
                {posted.permalink && (
                  <>
                    {" — "}
                    <a href={posted.permalink} target="_blank" rel="noreferrer" className="underline">
                      view post
                    </a>
                  </>
                )}
              </p>
            )}

            {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={publish}
                disabled={busy || !photos.length || tooLong || tooManyTags}
                className="rounded-md bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Posting… (up to a minute)" : "Post to Instagram"}
              </button>
              <button onClick={onClose} disabled={busy} className="text-sm text-muted">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
