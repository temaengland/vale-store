"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  product_name?: string;
  status: string;
  created_at: string;
};

const statusOptions = ["new", "contacted", "won", "lost"];

export default function InquiriesPanel() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadError, setLoadError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/inquiries");
    if (!res.ok) {
      setLoadError("Couldn't load enquiries. Check Supabase env vars are set.");
      return;
    }
    const data = await res.json();
    setInquiries(data.inquiries ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/inquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setInquiries((list) =>
      list.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  return (
    <div className="mt-6">
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      <div className="space-y-3">
        {inquiries.map((i) => (
          <div key={i.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{i.name}</p>
              <p className="text-xs text-muted">
                {new Date(i.created_at).toLocaleString("en-GB")}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {i.email}
              {i.phone ? ` · ${i.phone}` : ""}
              {i.product_name ? ` · re: ${i.product_name}` : ""}
            </p>
            <p className="mt-2 text-sm">{i.message}</p>
            <select
              value={i.status}
              onChange={(e) => updateStatus(i.id, e.target.value)}
              className="mt-3 rounded-md border border-border-strong px-2 py-1 text-xs"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
        {inquiries.length === 0 && !loadError && (
          <p className="text-sm text-muted">
            No enquiries yet — they'll show up here as visitors get in touch.
          </p>
        )}
      </div>
    </div>
  );
}
