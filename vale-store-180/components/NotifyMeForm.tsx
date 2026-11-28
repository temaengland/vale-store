"use client";

import { useState } from "react";

export default function NotifyMeForm({
  category,
  subcategory,
  era,
  productSlug,
}: {
  category: string;
  subcategory?: string;
  era?: string;
  productSlug?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/notify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          category,
          subcategory,
          era,
          product_slug: productSlug,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-ink">
        You're on the list — we'll email you the moment something like this
        comes in.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        required
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-border-strong px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-ink px-4 py-2 text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Notify me"}
      </button>
      {status === "error" && (
        <p className="w-full text-sm text-red-600">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
