"use client";

import { useEffect, useState } from "react";

// Update 167: old eBay account → a DRAFTS file for the new account (pl.ten_60).
// Upload it in eBay Seller Hub → Reports → Uploads; items land in Drafts; finish delivery by hand.
type Row = { itemId: string; title: string; duplicateOf: string | null };
type DraftRow = {
  sku: string;
  categoryId: string;
  title: string;
  price: string;
  photos: string;
  conditionId: string;
  description: string;
  specifics?: Record<string, string>;
};

const HEAD = [
  "Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193|CC=UTF-8)",
  "Custom label (SKU)",
  "Category ID",
  "Title",
  "UPC",
  "Price",
  "Quantity",
  "Item photo URL",
  "Condition ID",
  "Description",
  "Format",
];

const cell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Update 168: eBay only recognises the file with its own #INFO lines on top.
const INFO = [
  "#INFO,Version=0.0.2,Template= eBay-draft-listings-template_GB,,,,,,,,",
  "#INFO Action and Category ID are required fields. 1) Set Action to Draft 2) Please find the category ID for your listings here: https://pages.ebay.com/sellerinformation/news/categorychanges.html,,,,,,,,,,",
  '"#INFO After you\'ve successfully uploaded your draft from the Seller Hub Reports tab, complete your drafts to active listings here: https://www.ebay.co.uk/sh/lst/drafts",,,,,,,,,,',
  "#INFO,,,,,,,,,,",
];

function toCsv(rows: DraftRow[]) {
  // Update 169: item specifics (Brand, Material, Type…) go in as eBay "C:Name" columns.
  const names: string[] = [];
  for (const r of rows) for (const n of Object.keys(r.specifics || {})) if (!names.includes(n)) names.push(n);
  const lines = [...INFO, [...HEAD, ...names.map((n) => `C:${n}`)].map((h, i) => (i < HEAD.length ? h : cell(h))).join(",")];
  for (const r of rows)
    lines.push(
      [
        "Draft",
        r.sku,
        r.categoryId,
        r.title,
        "",
        r.price,
        "1",
        r.photos,
        r.conditionId,
        r.description,
        "FixedPrice",
        ...names.map((n) => (r.specifics || {})[n] || ""),
      ]
        .map(cell)
        .join(",")
    );
  return lines.join("\n");
}

export default function EbayOldPanel() {
  const [status, setStatus] = useState<{ connected: boolean; connectedAt?: string | null } | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/ebay/old")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
    const q = new URLSearchParams(window.location.search);
    if (q.get("ebay") === "old-connected") setMsg("Old eBay account connected ✓ — press “Load old listings”.");
  }, []);

  async function load() {
    setBusy("Loading old listings…");
    setMsg("");
    try {
      const r = await fetch("/api/admin/ebay/old?list=1");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load.");
      const list: Row[] = d.listings || [];
      setRows(list);
      setPicked(new Set(list.filter((x) => !x.duplicateOf).map((x) => x.itemId)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load.");
    } finally {
      setBusy("");
    }
  }

  async function build() {
    const ids = (rows || []).filter((r) => picked.has(r.itemId)).map((r) => r.itemId);
    if (!ids.length) return;
    const out: DraftRow[] = [];
    const errs: string[] = [];
    setErrors([]);
    for (let i = 0; i < ids.length; i += 15) {
      setBusy(`Reading listings ${i + 1}–${Math.min(i + 15, ids.length)} of ${ids.length}…`);
      try {
        const r = await fetch("/api/admin/ebay/old", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: ids.slice(i, i + 15) }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "failed");
        out.push(...(d.rows || []));
        for (const e of d.errors || []) errs.push(`${e.itemId}: ${e.error}`);
      } catch (e) {
        errs.push(`items ${i + 1}–${i + 15}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setBusy("");
    setErrors(errs);
    if (!out.length) {
      setMsg("Nothing to download.");
      return;
    }
    const blob = new Blob([toCsv(out)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ebay-drafts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg(
      `File ready: ${out.length} drafts. On eBay (pl.ten_60): Seller Hub → Reports → Uploads → Upload template → choose this file. Items appear in Listings → Drafts.`
    );
  }

  const fresh = (rows || []).filter((r) => !r.duplicateOf);

  return (
    <div className="mb-8 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Old eBay account → drafts file for new eBay</p>
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
              disabled={Boolean(busy)}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink disabled:opacity-50"
            >
              Load old listings
            </button>
          )}
          {rows && (
            <button
              onClick={build}
              disabled={Boolean(busy) || !picked.size}
              className="rounded-md bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Download drafts file ({picked.size})
            </button>
          )}
        </div>
      </div>
      {!status?.connected && (
        <p className="mt-2 text-xs text-muted">On the eBay page that opens, sign in with the OLD account, not pl.ten_60.</p>
      )}
      {busy && <p className="mt-3 text-xs text-muted">{busy}</p>}
      {msg && <p className="mt-3 text-xs">{msg}</p>}
      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-red-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {rows && (
        <div className="mt-4">
          <p className="mb-2 text-xs">
            {rows.length} live on the old account · {fresh.length} not on the site/new eBay (shown) · {picked.size} selected
          </p>
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            {fresh.map((r) => (
              <label key={r.itemId} className="flex items-start gap-2 border-b border-border px-3 py-2 text-xs last:border-0">
                <input
                  type="checkbox"
                  checked={picked.has(r.itemId)}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(r.itemId);
                      else n.delete(r.itemId);
                      return n;
                    })
                  }
                />
                <span className="flex-1">{r.title}</span>
                <a href={`https://www.ebay.co.uk/itm/${r.itemId}`} target="_blank" rel="noreferrer" className="text-muted underline">
                  view
                </a>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
