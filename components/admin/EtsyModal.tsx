"use client";

import { useEffect, useState } from "react";

// Items → Etsy (update 142): shows how the Etsy listing will look, lets you
// edit it, sends it to Etsy as a DRAFT, and can publish it.

type Draft = {
  title: string;
  description: string;
  price: number;
  whenMade: string | null;
  taxonomyId: number | null;
  tags: string[];
  materials: string[];
};
type Link = { listingId: number; state: string; at: string };
type Prepared = {
  draft: Draft;
  candidates: { id: number; path: string }[];
  photos: string[];
  shipping: string;
  link: Link | null;
  vintageOk: boolean;
  aiNote?: string;
  sitePrice?: number;
};

const WHEN = [
  ["before_1700", "Before 1700"],
  ["1700s", "1700s"],
  ["1800s", "1800s"],
  ["1900s", "1900s"],
  ["1910s", "1910s"],
  ["1920s", "1920s"],
  ["1930s", "1930s"],
  ["1940s", "1940s"],
  ["1950s", "1950s"],
  ["1960s", "1960s"],
  ["1970s", "1970s"],
  ["1980s", "1980s"],
  ["1990s", "1990s"],
  ["2000_2006", "2000–2006"],
  ["before_2007", "Before 2007 (decade unknown)"],
];

function whenLabel(w: string | null) {
  if (!w) return "";
  if (/^\d{4}s$/.test(w)) return `Vintage from the ${w}`;
  if (w === "before_1700") return "Vintage from before 1700";
  if (w === "2000_2006") return "Vintage from 2000–2006";
  return "Vintage item";
}

export default function EtsyModal({
  item,
  shopName,
  onClose,
  onChanged,
}: {
  item: { id: string; name: string };
  shopName?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<Prepared | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [link, setLink] = useState<Link | null>(null);
  const [photo, setPhoto] = useState(0);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/admin/etsy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, productId: item.id, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "Failed");
    return j;
  }

  useEffect(() => {
    setBusy("prepare");
    call("prepare")
      .then((j: Prepared) => {
        setData(j);
        setD(j.draft);
        setTagsText(j.draft.tags.join(", "));
        setLink(j.link);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const tags = tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const badTags = tags.filter((t) => t.length > 20);
  const live = link && (link.state === "draft" || link.state === "active");

  async function send() {
    if (!d) return;
    setBusy("send");
    setError("");
    setDone("");
    try {
      const j = await call("send", { draft: { ...d, tags } });
      setLink({ listingId: j.listingId, state: link?.state === "active" ? "active" : "draft", at: new Date().toISOString() });
      setDone(j.updated ? "Updated on Etsy ✓" : `Sent to Etsy as a draft ✓ (${j.photos} photos)`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    if (!confirm("Publish on Etsy now? Etsy charges its listing fee (about 16p).")) return;
    setBusy("publish");
    setError("");
    try {
      await call("publish");
      setLink((l) => (l ? { ...l, state: "active" } : l));
      setDone("Published on Etsy ✓");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  const input = "mt-1 w-full rounded-md border border-border-strong px-3 py-2 text-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Etsy</h2>
            <p className="text-xs text-muted">
              {shopName || "Etsy shop"} · {item.name}
            </p>
          </div>
          <button onClick={onClose} disabled={!!busy} className="text-xl leading-none text-muted" aria-label="Close">
            ×
          </button>
        </div>

        {busy === "prepare" && <p className="mt-6 text-sm text-muted">Preparing the Etsy listing… (AI writes the title and tags)</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {data && d && (
          <>
            {data.aiNote && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{data.aiNote}</p>}
            {/* How it looks on Etsy */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-[#F1641E]">Preview — how buyers see it on Etsy</p>
            <div className="mt-2 grid gap-4 rounded-xl border border-border p-3 sm:grid-cols-[1.1fr_1fr]">
              <div>
                {data.photos[photo] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photos[photo]} alt="" className="aspect-square w-full rounded-lg bg-[#f4f1ea] object-contain" />
                )}
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {data.photos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      onClick={() => setPhoto(i)}
                      className={`h-12 w-12 shrink-0 cursor-pointer rounded object-cover ${i === photo ? "ring-2 ring-ink" : "opacity-70"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-sm">
                <p className="text-xl font-semibold">£{(d.price / 100).toLocaleString("en-GB")}</p>
                <p className="mt-2 leading-snug">{d.title}</p>
                <p className="mt-2 text-xs text-muted">{shopName || "Your shop"}</p>
                <p className="mt-3 rounded-full bg-[#f4f1ea] px-3 py-1 text-xs inline-block">{whenLabel(d.whenMade) || "Not vintage — can't go on Etsy"}</p>
                <p className="mt-3 text-xs">🚚 {data.shipping}</p>
                <p className="mt-1 text-xs">↩︎ Returns accepted within 14 days</p>
                <div className="mt-3 rounded-full bg-ink px-4 py-2 text-center text-xs text-white">Add to basket</div>
                <p className="mt-3 line-clamp-6 whitespace-pre-line text-xs text-muted">{d.description}</p>
              </div>
            </div>

            {/* Edit */}
            <label className="mt-5 block text-xs text-muted">Title — {d.title.length}/140</label>
            <input value={d.title} maxLength={140} onChange={(e) => setD({ ...d, title: e.target.value })} className={input} />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-muted">
                  Price on Etsy (£){data.sitePrice && data.sitePrice !== d.price ? ` — site £${(data.sitePrice / 100).toLocaleString("en-GB")}` : ""}
                </label>
                <input
                  type="number"
                  min={1}
                  value={(d.price / 100).toString()}
                  onChange={(e) => setD({ ...d, price: Math.round(Number(e.target.value || 0) * 100) })}
                  className={input}
                />
              </div>
              <div>
                <label className="block text-xs text-muted">When made (Etsy: vintage = 20+ years)</label>
                <select value={d.whenMade || ""} onChange={(e) => setD({ ...d, whenMade: e.target.value || null })} className={input}>
                  <option value="">— not vintage —</option>
                  {WHEN.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="mt-3 block text-xs text-muted">Etsy category</label>
            <select
              value={d.taxonomyId ?? ""}
              onChange={(e) => setD({ ...d, taxonomyId: e.target.value ? Number(e.target.value) : null })}
              className={input}
            >
              {data.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs text-muted">
              Tags — {tags.length}/13, each up to 20 letters, separated by commas
            </label>
            <textarea value={tagsText} onChange={(e) => setTagsText(e.target.value)} rows={2} className={input} />
            {(tags.length > 13 || badTags.length > 0) && (
              <p className="mt-1 text-xs text-red-600">
                {tags.length > 13 ? "Etsy allows 13 tags. " : ""}
                {badTags.length ? `Too long: ${badTags.join(", ")}` : ""}
              </p>
            )}

            <label className="mt-3 block text-xs text-muted">Materials (comma separated)</label>
            <input
              value={d.materials.join(", ")}
              onChange={(e) => setD({ ...d, materials: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
              className={input}
            />

            <label className="mt-3 block text-xs text-muted">Description</label>
            <textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={8} className={input} />

            {link && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                On Etsy: {link.state === "active" ? "live" : link.state} ·{" "}
                <a
                  href={`https://www.etsy.com/your/shops/me/listing-editor/edit/${link.listingId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  open in Etsy
                </a>
                {link.state === "active" && (
                  <>
                    {" · "}
                    <a href={`https://www.etsy.com/listing/${link.listingId}`} target="_blank" rel="noreferrer" className="underline">
                      view listing
                    </a>
                  </>
                )}
              </p>
            )}
            {done && <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={send}
                disabled={!!busy || !d.whenMade || !d.taxonomyId || tags.length > 13 || badTags.length > 0 || !d.title.trim()}
                className="rounded-md bg-ink px-5 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy === "send" ? "Sending… (up to a minute)" : live ? "Update on Etsy" : "Send to Etsy as draft"}
              </button>
              {link?.state === "draft" && (
                <button
                  onClick={publish}
                  disabled={!!busy}
                  className="rounded-md border border-[#F1641E] px-5 py-2 text-sm text-[#F1641E] disabled:opacity-50"
                >
                  {busy === "publish" ? "Publishing…" : "Publish on Etsy"}
                </button>
              )}
              <button onClick={onClose} disabled={!!busy} className="text-sm text-muted">
                Close
              </button>
            </div>
            {!d.whenMade && (
              <p className="mt-2 text-xs text-muted">
                Etsy only allows items made 20+ years ago (or handmade). If this piece is vintage, choose when it was made.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
