"use client";

import { useEffect, useState } from "react";

type OrderItem = {
  slug: string | null;
  name: string | null;
  price: number;
  cost_price: number | null;
};

type Order = {
  id: string;
  stripe_session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: Record<string, string> | null;
  delivery_notes: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_amount: number;
  total: number;
  currency: string;
  created_at: string;
};

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? "Couldn't load orders.");
        return;
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setLoadError("Couldn't reach the server — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalItemsRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalShipping = orders.reduce((sum, o) => sum + o.shipping_amount, 0);
  const totalCost = orders.reduce(
    (sum, o) =>
      sum + o.items.reduce((s, it) => s + (it.cost_price ?? 0), 0),
    0
  );
  const totalProfit = totalItemsRevenue - totalCost;

  function exportCsv() {
    const rows = [
      [
        "Date",
        "Order ID",
        "Customer name",
        "Customer email",
        "Items",
        "Items subtotal (£)",
        "Shipping (£)",
        "Total paid (£)",
        "Cost price (£)",
        "Profit (£)",
      ],
    ];
    for (const o of orders) {
      const itemNames = o.items.map((it) => it.name).join("; ");
      const costTotal = o.items.reduce((s, it) => s + (it.cost_price ?? 0), 0);
      rows.push([
        new Date(o.created_at).toLocaleDateString("en-GB"),
        o.stripe_session_id,
        o.customer_name ?? "",
        o.customer_email ?? "",
        itemNames,
        (o.subtotal / 100).toFixed(2),
        (o.shipping_amount / 100).toFixed(2),
        (o.total / 100).toFixed(2),
        (costTotal / 100).toFixed(2),
        ((o.subtotal - costTotal) / 100).toFixed(2),
      ]);
    }
    const csv = rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `charmchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-10">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Total revenue</p>
          <p className="mt-1 text-lg text-ink">{formatPence(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Shipping collected</p>
          <p className="mt-1 text-lg text-ink">{formatPence(totalShipping)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Cost of items sold</p>
          <p className="mt-1 text-lg text-ink">{formatPence(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Profit on items</p>
          <p className="mt-1 text-lg text-ink">{formatPence(totalProfit)}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={exportCsv}
          disabled={orders.length === 0}
          className="rounded-md border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {loadError && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{loadError}</p>
          <button onClick={loadOrders} className="mt-1.5 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-muted">Loading orders…</p>}

      {!loading && orders.length === 0 && !loadError && (
        <p className="mt-6 text-sm text-muted">
          No orders yet — they'll show up here automatically once someone
          completes a purchase.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-ink">
                {new Date(o.created_at).toLocaleString("en-GB")}
              </p>
              <p className="text-sm text-ink">{formatPence(o.total)}</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              {o.customer_name ?? "—"} · {o.customer_email ?? "—"}
              {o.customer_phone ? ` · ${o.customer_phone}` : ""}
            </p>
            {o.shipping_address && (
              <p className="mt-1 text-xs text-muted">
                {[
                  o.shipping_address.line1,
                  o.shipping_address.line2,
                  o.shipping_address.city,
                  o.shipping_address.postal_code,
                  o.shipping_address.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {o.delivery_notes && (
              <p className="mt-1 text-xs text-muted">
                Note: {o.delivery_notes}
              </p>
            )}
            <div className="mt-2 space-y-1">
              {o.items.map((it, i) => (
                <p key={i} className="text-sm text-ink">
                  {it.name} — {formatPence(it.price)}
                </p>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Items {formatPence(o.subtotal)} + shipping{" "}
              {formatPence(o.shipping_amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
