"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/products";

export default function BuyNowButton({ slug, price }: { slug: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setLoading(false);
      setError(data.error ?? "Something went wrong.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-md bg-ink px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Redirecting to payment…" : `Buy now — ${formatPrice(price)}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
