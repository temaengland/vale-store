"use client";

import { useEffect, useState } from "react";

type NotifyRequest = {
  id: string;
  email: string;
  category: string;
  subcategory: string | null;
  era: string | null;
  product_slug: string | null;
  created_at: string;
};

export default function NotifyRequestsPanel() {
  const [requests, setRequests] = useState<NotifyRequest[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notify-requests");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load sign-ups.");
        return;
      }
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setLoadError("Couldn't reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mt-10">
      <p className="text-sm text-muted">
        People who asked to be told when something specific comes in —
        worth a quick email once you list a matching piece.
      </p>

      {loadError && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button onClick={load} className="mt-1.5 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {!loading && requests.length === 0 && !loadError && (
        <p className="mt-6 text-sm text-muted">No sign-ups yet.</p>
      )}

      <div className="mt-4 space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-border p-3 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-ink">{r.email}</p>
              <p className="text-xs text-muted">
                {new Date(r.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {[r.category, r.subcategory, r.era].filter(Boolean).join(" · ")}
              {r.product_slug && ` — was viewing "${r.product_slug}"`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
