"use client";

import { useEffect, useState } from "react";
import { Product, formatPrice } from "@/lib/products";
import { useLanguage } from "@/lib/language-context";

// Replace with the real business WhatsApp number, in international format
// with no + or spaces, e.g. 447911123456 for a UK mobile.
const WHATSAPP_NUMBER = "447918527790";

export default function InquiryForm({
  product,
  displayName,
}: {
  product: Product;
  displayName?: string;
}) {
  const { t } = useLanguage();
  const name0 = displayName ?? product.name;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `${t("product.interestedIn")} ${name0} (${formatPrice(product.price)}).`
  );
  const [messageEdited, setMessageEdited] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  // Re-fill the message template when the language changes, unless the
  // buyer has already started editing it themselves.
  useEffect(() => {
    if (!messageEdited) {
      setMessage(
        `${t("product.interestedIn")} ${name0} (${formatPrice(product.price)}).`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t("product.interestedIn"), name0]);

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
        {t("product.sent")}
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
        {t("product.askWhatsapp")}
      </a>

      <p className="mt-6 mb-2 text-xs tracking-widest text-muted">
        {t("product.orLeaveDetails")}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          required
          placeholder={t("product.yourName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder={t("product.yourEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <input
          placeholder={t("product.phoneOptional")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setMessageEdited(true);
          }}
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md border border-ink px-5 py-2 text-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
        >
          {status === "sending" ? t("product.sending") : t("product.send")}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600">{t("product.sendError")}</p>
        )}
      </form>
    </div>
  );
}
