"use client";

import { useEffect, useState } from "react";
import ProductsPanel from "@/components/admin/ProductsPanel";
import InquiriesPanel from "@/components/admin/InquiriesPanel";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"products" | "inquiries">("products");

  useEffect(() => {
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
        <h1 className="font-serif text-2xl">Admin</h1>
        <button onClick={handleLogout} className="text-sm text-muted">
          Log out
        </button>
      </div>

      <div className="mt-6 flex gap-2 border-b border-border">
        {(["products", "inquiries"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "products" ? "Items" : "Enquiries"}
          </button>
        ))}
      </div>

      {tab === "products" ? <ProductsPanel /> : <InquiriesPanel />}
    </div>
  );
}
