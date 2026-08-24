"use client";

import { useEffect, useState } from "react";
import { categories } from "@/lib/products";

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

export default function DraftsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return (
    <div className="mt-10">
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
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
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
