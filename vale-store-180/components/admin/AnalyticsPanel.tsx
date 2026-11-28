"use client";

import { useEffect, useState } from "react";
import { categories } from "@/lib/products";

type ProductViews = {
  id: string;
  slug: string;
  name: string;
  category: string;
  image?: string | null;
  images?: string[] | null;
  view_count: number;
};

type CategoryViews = { category: string; count: number };

export default function AnalyticsPanel() {
  const [products, setProducts] = useState<ProductViews[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryViews[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load analytics.");
        return;
      }
      const data = await res.json();
      setProducts(data.products ?? []);
      setCategoryCounts(data.categories ?? []);
    } catch {
      setLoadError("Couldn't reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const countFor = (slug: string) =>
    categoryCounts.find((c) => c.category === slug)?.count ?? 0;
  const maxCategoryCount = Math.max(1, ...categories.map((c) => countFor(c.slug)));
  const maxProductCount = Math.max(1, ...products.map((p) => p.view_count));

  return (
    <div className="mt-10">
      {loadError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button onClick={load} className="mt-1.5 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading analytics…</p>}

      {!loading && !loadError && (
        <>
          <p className="text-xs tracking-widest text-muted">
            CATEGORY VIEWS
          </p>
          <div className="mt-3 space-y-2">
            {categories.map((c) => {
              const count = countFor(c.slug);
              return (
                <div key={c.slug} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-sm text-ink">{c.name}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{
                        width: `${(count / maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="w-10 shrink-0 text-right text-sm text-muted">
                    {count}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-xs tracking-widest text-muted">
            MOST VIEWED ITEMS
          </p>
          <div className="mt-3 space-y-2">
            {products.length === 0 && (
              <p className="text-sm text-muted">No views recorded yet.</p>
            )}
            {products.map((p) => {
              const cover = p.images && p.images.length > 0 ? p.images[0] : p.image;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-border bg-surface object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md bg-surface" />
                  )}
                  <p className="line-clamp-1 flex-1 text-sm text-ink">
                    {p.name}
                  </p>
                  <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{
                        width: `${(p.view_count / maxProductCount) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="w-10 shrink-0 text-right text-sm text-muted">
                    {p.view_count}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
