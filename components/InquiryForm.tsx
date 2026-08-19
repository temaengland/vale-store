"use client";

import { useState } from "react";
import { Product, formatPrice } from "@/lib/products";

// Replace with the real business WhatsApp number, in international format
// with no + or spaces, e.g. 447911123456 for a UK mobile.
const WHATSAPP_NUMBER = "447918527790";

export default function InquiryForm({ product }: { product: Product }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `Hi, I'm interested in the ${product.name} (${formatPrice(product.price)}).`
  );
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          message,
          product_slug: product.slug,
          product_name: product.name,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-8 rounded-md bg-surface px-4 py-3 text-sm text-ink">
        Thanks — we've got your message and will get back to you shortly.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-md bg-ink px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity"
      >
        Ask about this on WhatsApp
      </a>

      <p className="mt-6 mb-2 text-xs tracking-widest text-muted">
        OR LEAVE YOUR DETAILS
      </p>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md border border-ink px-5 py-2 text-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">
            Something went wrong — please try WhatsApp instead for now.
          </p>
        )}
      </form>
    </div>
  );
}
