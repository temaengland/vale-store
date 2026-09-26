"use client";

import { useEffect, useState } from "react";
import ProductsPanel from "@/components/admin/ProductsPanel";
import InquiriesPanel from "@/components/admin/InquiriesPanel";
import OrdersPanel from "@/components/admin/OrdersPanel";
import DraftsPanel from "@/components/admin/DraftsPanel";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import NotifyRequestsPanel from "@/components/admin/NotifyRequestsPanel";
import NotificationsPanel, {
  useUnreadNotificationCount,
} from "@/components/admin/NotificationsPanel";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<
    | "notifications"
    | "products"
    | "drafts"
    | "analytics"
    | "orders"
    | "inquiries"
    | "notify"
  >("notifications");
  const unreadCount = useUnreadNotificationCount();
  const [editId, setEditId] = useState<string | null>(null);
  const [focusDraftId, setFocusDraftId] = useState<string | null>(null);

  useEffect(() => {
    // Quietly check eBay for sold items when admin opens (at most every 10 min).
    try {
      const k = "charmchase_ebay_sync_at";
      const last = Number(localStorage.getItem(k) || 0);
      if (Date.now() - last > 10 * 60 * 1000) {
        localStorage.setItem(k, String(Date.now()));
        fetch("/api/ebay/sync", { method: "POST" }).catch(() => {});
      }
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    // Returning from eBay's consent screen → open the Review drafts tab.
    if (new URLSearchParams(window.location.search).has("ebay")) setTab("drafts");
    fetch("/api/admin/products").then((res) => {
      setAuthed(res.ok);
      setChecking(false);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error ?? "Login failed.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setPassword("");
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-20">
        <h1 className="font-serif text-2xl">Admin login</h1>
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-ink px-4 py-2 text-sm text-white"
          >
            Log in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">
          Admin
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 align-middle text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        <button onClick={handleLogout} className="text-sm text-muted">
          Log out
        </button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [scroll-snap-type:x_proximity]">
        {(
          [
            "notifications",
            "products",
            "drafts",
            "analytics",
            "orders",
            "inquiries",
            "notify",
          ] as const
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 scroll-mx-4 px-4 py-2 text-sm border-b-2 -mb-px transition-colors [scroll-snap-align:start] ${
              tab === t
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "notifications" ? (
              <>
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </>
            ) : t === "products" ? (
              "Items"
            ) : t === "drafts" ? (
              "Review drafts"
            ) : t === "analytics" ? (
              "Analytics"
            ) : t === "orders" ? (
              "Orders"
            ) : t === "inquiries" ? (
              "Enquiries"
            ) : (
              "Notify sign-ups"
            )}
          </button>
        ))}
      </div>

      {tab === "notifications" ? (
        <NotificationsPanel />
      ) : tab === "products" ? (
        <ProductsPanel
          editId={editId}
          onEditHandled={() => setEditId(null)}
          onBackToDrafts={(id) => {
            setFocusDraftId(id ?? null);
            setTab("drafts");
          }}
        />
      ) : tab === "drafts" ? (
        <DraftsPanel
          focusId={focusDraftId}
          onEdit={(id) => {
            setEditId(id);
            setTab("products");
          }}
        />
      ) : tab === "analytics" ? (
        <AnalyticsPanel />
      ) : tab === "notify" ? (
        <NotifyRequestsPanel />
      ) : tab === "orders" ? (
        <OrdersPanel />
      ) : (
        <InquiriesPanel />
      )}
    </div>
  );
}
