"use client";

import { useEffect, useState } from "react";
import { categories } from "@/lib/products";

type EbayStatus = {
  configured: boolean;
  connected: boolean;
  connectedAt?: string;
  canEndListings?: boolean;
  lastSync?: { at: string; summary: string } | null;
};
type ImportRow = { itemId: string; title: string; result: string };

type Draft = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string | null;
  image?: string | null;
  images?: string[] | null;
  ebay_item_id?: string | null;
};

export default function DraftsPanel({
  onEdit,
  focusId,
}: { onEdit?: (id: string) => void; focusId?: string | null } = {}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ebay, setEbay] = useState<EbayStatus | null>(null);
  const [ebayMsg, setEbayMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [log, setLog] = useState<ImportRow[]>([]);

  async function loadEbay() {
    try {
      const res = await fetch("/api/admin/ebay/status");
      if (res.ok) setEbay(await res.json());
    } catch {
      /* optional */
    }
  }

  const [syncing, setSyncing] = useState(false);
  async function runSync() {
    setSyncing(true);
    setEbayMsg("");
    try {
      const res = await fetch("/api/ebay/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Sync failed.");
      setEbayMsg(`Synced ✓ ${data.summary}`);
      loadEbay();
      loadDrafts();
    } catch (e) {
      setEbayMsg(`eBay sync: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function runImport() {
    setImporting(true);
    setLog([]);
    setEbayMsg("");
    let page = 1;
    let totalPages = 1;
    try {
      do {
        setProgress(`Importing page ${page} of ${totalPages}…`);
        const res = await fetch("/api/admin/ebay/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Import failed.");
        totalPages = data.totalPages || 0;
        setLog((l) => [...l, ...(data.results || [])]);
        page++;
      } while (page <= totalPages);
      setProgress("");
      setEbayMsg("Import finished.");
      loadDrafts();
    } catch (e) {
      setProgress("");
      setEbayMsg(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function loadDrafts() {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/drafts");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load drafts.");
        return;
      }
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {
      setLoadError("Couldn't reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
    loadEbay();
    const q = new URLSearchParams(window.location.search);
    if (q.get("ebay") === "connected") setEbayMsg("eBay connected ✓ — now press “Import from eBay”.");
    if (q.get("ebay") === "error") setEbayMsg(`eBay: ${q.get("msg") || "connection failed"}`);
  }, []);

  async function updateDraft(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Update failed.");
        return;
      }
      if (patch.publish) {
        // Published items leave the drafts queue entirely.
        setDrafts((d) => d.filter((x) => x.id !== id));
      } else {
        const data = await res.json();
        setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...data.product } : x)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/drafts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Delete failed.");
        return;
      }
      setDrafts((d) => d.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  // Back from "Edit": scroll to the item that was just saved and highlight it,
  // so it can be published straight away.
  const [highlight, setHighlight] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId || loading) return;
    const el = document.getElementById(`draft-${focusId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(focusId);
      const t = setTimeout(() => setHighlight(null), 4000);
      return () => clearTimeout(t);
    }
  }, [focusId, loading, drafts]);

  const imported = log.filter((r) => r.result.startsWith("imported")).length;

  return (
    <div className="mt-10">
      <div className="mb-8 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">eBay</p>
            <p className="text-xs text-muted">
              {!ebay
                ? "Checking…"
                : !ebay.configured
                ? "Not set up yet (EBAY_RUNAME missing in Vercel)."
                : ebay.connected
                ? `Connected${ebay.connectedAt ? ` · ${new Date(ebay.connectedAt).toLocaleDateString("en-GB")}` : ""}`
                : "Not connected"}
            </p>
          </div>
          <div className="flex gap-2">
            {ebay?.configured && (
              <a
                href="/api/admin/ebay/connect"
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink"
              >
                {ebay.connected ? "Reconnect eBay" : "Connect eBay"}
              </a>
            )}
            {ebay?.connected && (
              <button
                onClick={runImport}
                disabled={importing}
                className="rounded-md bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import from eBay"}
              </button>
            )}
            {ebay?.connected && (
              <button
                onClick={runSync}
                disabled={syncing}
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "Sync sold items"}
              </button>
            )}
          </div>
        </div>
        {ebay?.connected && (
          <p className="mt-2 text-xs text-muted">
            Sold-item sync:{" "}
            {ebay.lastSync
              ? `last run ${new Date(ebay.lastSync.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} — ${ebay.lastSync.summary}`
              : "not run yet"}
          </p>
        )}
        {ebay?.connected && !ebay.canEndListings && (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-ink">
            Press <b>Reconnect eBay</b> once so the site can also end eBay listings when an item sells on the
            site. (Sold on eBay → Sold on the site already works.)
          </p>
        )}
        {progress && <p className="mt-3 text-xs text-muted">{progress}</p>}
        {ebayMsg && <p className="mt-3 text-sm">{ebayMsg}</p>}
        {log.length > 0 && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-md bg-surface p-3 text-xs">
            <p className="mb-2 font-medium">
              {imported} imported · {log.length - imported} skipped or failed
            </p>
            {log.map((r) => (
              <p key={r.itemId} className="line-clamp-1">
                {r.result.startsWith("imported") ? "✓" : r.result.startsWith("error") ? "✗" : "–"} {r.title} — {r.result}
              </p>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-muted">
        Items pulled in from eBay land here first — nothing goes live on the
        site until you publish it. Fix the category if needed, then publish
        or delete.
      </p>

      {loadError && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button onClick={loadDrafts} className="mt-1.5 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-muted">Loading drafts…</p>}

      {!loading && drafts.length === 0 && !loadError && (
        <p className="mt-6 text-sm text-muted">
          No drafts waiting — new eBay listings will show up here
          automatically once the sync is running.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {drafts.map((d) => {
          const cover = d.images && d.images.length > 0 ? d.images[0] : d.image;
          const cat = categories.find((c) => c.slug === d.category);
          return (
            <div
              key={d.id}
              id={`draft-${d.id}`}
              className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors ${
                highlight === d.id ? "border-[#AD8A4E] bg-amber-50" : "border-border"
              }`}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-md border border-border bg-surface object-contain"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-md bg-surface" />
              )}

              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm text-ink">{d.name}</p>
                <p className="text-xs text-muted">
                  £{(d.price / 100).toFixed(2)}
                </p>
              </div>

              <select
                value={d.category}
                onChange={(e) => updateDraft(d.id, { category: e.target.value, subcategory: null })}
                disabled={busyId === d.id}
                className="rounded-md border border-border-strong px-2 py-1.5 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={d.subcategory ?? ""}
                onChange={(e) => updateDraft(d.id, { subcategory: e.target.value || null })}
                disabled={busyId === d.id}
                className="rounded-md border border-border-strong px-2 py-1.5 text-xs"
              >
                <option value="">No subcategory</option>
                {cat?.subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {onEdit && (
                <button
                  onClick={() => onEdit(d.id)}
                  disabled={busyId === d.id}
                  className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink transition-colors disabled:opacity-50"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => updateDraft(d.id, { publish: true })}
                disabled={busyId === d.id}
                className="rounded-md border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
              >
                Publish
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${d.name}"? This only removes the draft, not the eBay listing.`)) {
                    deleteDraft(d.id);
                  }
                }}
                disabled={busyId === d.id}
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
