"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  type: "order" | "inquiry" | "notify" | "ebay";
  created_at: string;
  headline: string;
  detail: string;
};

const LAST_SEEN_KEY = "charmchase_admin_notifications_last_seen";

// A tiny in-memory pub/sub so the badge in the header resets the moment
// the Notifications panel marks items as seen — without a page reload.
const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function typeIcon(type: FeedItem["type"]) {
  if (type === "order") return "💰";
  if (type === "inquiry") return "💬";
  if (type === "ebay") return "🏷️";
  return "🔔";
}

export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);

  function recalculate() {
    fetch("/api/admin/notifications")
      .then((res) => (res.ok ? res.json() : { feed: [] }))
      .then((data) => {
        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
        const unread = (data.feed ?? []).filter(
          (item: FeedItem) => new Date(item.created_at).getTime() > lastSeenTime
        ).length;
        setCount(unread);
      })
      .catch(() => {});
  }

  useEffect(() => {
    recalculate();
    // Re-run whenever the Notifications panel marks items as seen.
    listeners.add(recalculate);
    return () => {
      listeners.delete(recalculate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return count;
}

export default function NotificationsPanel() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [lastSeenTime, setLastSeenTime] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoadError("");
    setLoading(true);
    try {
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
      setLastSeenTime(lastSeen ? new Date(lastSeen).getTime() : 0);

      const res = await fetch("/api/admin/notifications");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load notifications.");
        return;
      }
      const data = await res.json();
      setFeed(data.feed ?? []);

      // Mark everything as seen and immediately update the header badge.
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      notifyListeners();
    } catch {
      setLoadError("Couldn't reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-10">
      <p className="text-sm text-muted">
        Everything that's happened lately — new orders, enquiries,
        eBay sales and notify sign-ups, all in one place.
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

      {!loading && feed.length === 0 && !loadError && (
        <p className="mt-6 text-sm text-muted">Nothing yet.</p>
      )}

      <div className="mt-4 space-y-2">
        {feed.map((item) => {
          const isNew = new Date(item.created_at).getTime() > lastSeenTime;
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                isNew ? "border-ink bg-surface" : "border-border"
              }`}
            >
              <span className="text-lg">{typeIcon(item.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{item.headline}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </div>
              <p className="shrink-0 text-xs text-muted">
                {new Date(item.created_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
