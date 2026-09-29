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
  compactOnDesktop = false,
}: {
  product: Product;
  displayName?: string;
  /** Update 125: on computers show a light WhatsApp button + "or ask by email"
   *  link; the form opens on click. Phones are unchanged. */
  compactOnDesktop?: boolean;
}) {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const hideOnDesktop = compactOnDesktop && !formOpen ? "lg:hidden" : "";
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
    <div className={compactOnDesktop ? "mt-8 lg:mt-5" : "mt-8"}>
      <div className={compactOnDesktop ? "lg:flex lg:items-center lg:gap-4" : ""}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className={`inline-block rounded-md bg-ink px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity ${
          compactOnDesktop
            ? "lg:inline-flex lg:items-center lg:gap-2 lg:border lg:border-border-strong lg:bg-white lg:px-4 lg:py-2.5 lg:text-ink lg:hover:border-ink lg:hover:opacity-100"
            : ""
        }`}
      >
        {compactOnDesktop && (
          <svg viewBox="0 0 24 24" className="hidden h-[17px] w-[17px] fill-[#25D366] lg:block" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
          </svg>
        )}
        {t("product.askWhatsapp")}
      </a>
      {compactOnDesktop && !formOpen && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="hidden text-sm text-muted underline underline-offset-2 hover:text-ink lg:inline"
        >
          {t("product.askByEmail")}
        </button>
      )}
      </div>

      <p className={`mt-6 mb-2 text-xs tracking-widest text-muted ${hideOnDesktop}`}>
        {t("product.orLeaveDetails")}
      </p>
      <form onSubmit={handleSubmit} className={`space-y-2.5 ${hideOnDesktop}`}>
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
