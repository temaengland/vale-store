"use client";

import { useEffect, useState } from "react";

// Update 161: move listings from the OLD eBay account to the main one.
type Row = { itemId: string; title: string; duplicateOf: string | null; movedTo: string | null };
type Result = { itemId: string; title: string; text: string; ok: boolean };

export default function EbayOldPanel({ onMoved }: { onMoved?: () => void }) {
  const [status, setStatus] = useState<{ connected: boolean; connectedAt?: string | null } | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [showDupes, setShowDupes] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ebay/old")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
    const q = new URLSearchParams(window.location.search);
    if (q.get("ebay") === "old-connected") setMsg("Old eBay account connected ✓ — press “Load old listings”.");
  }, []);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/ebay/old?list=1");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load.");
      const list: Row[] = d.listings || [];
      setRows(list);
      setPicked(new Set(list.filter((x) => !x.duplicateOf && !x.movedTo).map((x) => x.itemId)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load.");
    } finally {
      setLoading(false);
    }
  }

  async function move() {
    const todo = (rows || []).filter((r) => picked.has(r.itemId) && !r.movedTo);
    if (!todo.length) return;
    setResults([]);
    let done = 0;
    let okCount = 0;
    for (const r of todo) {
      setMoving(`Moving ${++done} of ${todo.length}…`);
      try {
        const res = await fetch("/api/admin/ebay/old", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: r.itemId }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "failed");
        const text = `moved → new eBay ${d.newItemId}${d.endError ? ` (old not ended: ${d.endError})` : ""}`;
        okCount++;
        setResults((x) => [...x, { itemId: r.itemId, title: r.title, text, ok: true }]);
        setRows((rs) => (rs || []).map((x) => (x.itemId === r.itemId ? { ...x, movedTo: d.newItemId } : x)));
      } catch (e) {
        setResults((x) => [...x, { itemId: r.itemId, title: r.title, text: e instanceof Error ? e.message : "failed", ok: false }]);
      }
    }
    setMoving("");
    if (okCount) {
      setMsg(`${okCount} moved. Now adding them to the site as drafts…`);
      onMoved?.();
    } else {
      setMsg("Nothing was moved — see the red lines below for the reason.");
    }
  }

  const visible = (rows || []).filter((r) => showDupes || (!r.duplicateOf && !r.movedTo));
  const dupes = (rows || []).filter((r) => r.duplicateOf || r.movedTo).length;

  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Old eBay account → new eBay</p>
          <p className="text-xs text-muted">
            {!status
              ? "Checking…"
              : status.connected
              ? `Old account connected${status.connectedAt ? ` · ${new Date(status.connectedAt).toLocaleDateString("en-GB")}` : ""}`
              : "Old account not connected"}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/ebay/connect?account=old"
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink"
          >
            {status?.connected ? "Reconnect old account" : "Connect old account"}
          </a>
          {status?.connected && (
            <button
              onClick={load}
              disabled={loading || Boolean(moving)}
              className="rounded-md bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load old listings"}
            </button>
          )}
        </div>
      </div>
      {!status?.connected && (
        <p className="mt-2 text-xs text-muted">
          On the eBay page that opens, sign in with the OLD account (e.g. Tim Antigua), not pl.ten_60.
        </p>
      )}
      {msg && <p className="mt-3 text-xs">{msg}</p>}

      {rows && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              {rows.length} live on the old account · {rows.length - dupes} not on the site/new eBay · {picked.size} selected
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showDupes} onChange={(e) => setShowDupes(e.target.checked)} /> show items we
                already have ({dupes})
              </label>
              <button
                onClick={move}
                disabled={!picked.size || Boolean(moving)}
                className="rounded-md bg-ink px-3 py-1.5 text-white disabled:opacity-50"
              >
                {moving || `Move ${picked.size} to new eBay`}
              </button>
            </span>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-border">
            {visible.map((r) => (
              <label key={r.itemId} className="flex items-start gap-2 border-b border-border px-3 py-2 text-xs last:border-0">
                <input
                  type="checkbox"
                  disabled={Boolean(r.movedTo)}
                  checked={picked.has(r.itemId) && !r.movedTo}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(r.itemId);
                      else n.delete(r.itemId);
                      return n;
                    })
                  }
                />
                <span className="flex-1">
                  {r.title}
                  {r.movedTo && <span className="ml-2 text-green-700">moved ✓</span>}
                  {r.duplicateOf && !r.movedTo && <span className="ml-2 text-muted">— already have: {r.duplicateOf}</span>}
                </span>
                <a
                  href={`https://www.ebay.co.uk/itm/${r.itemId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted underline"
                >
                  view
                </a>
              </label>
            ))}
            {!visible.length && <p className="p-3 text-xs text-muted">Nothing to move — everything is already on the site or the new eBay.</p>}
          </div>
          {results.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {results.map((r) => (
                <li key={r.itemId} className={r.ok ? "" : "text-red-700"}>
                  {r.ok ? "✓" : "✗"} {r.title} — {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
