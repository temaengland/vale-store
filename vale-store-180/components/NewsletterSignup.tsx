"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

// Update 117: "First look at new pieces" — emails are saved with the other
// notify requests (category "newsletter"), visible in Admin → Notify requests.
export default function NewsletterSignup() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("sending");
    try {
      const r = await fetch("/api/notify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), category: "newsletter" }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-16 flex flex-col gap-5 rounded-xl bg-ink px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <p className="font-serif text-2xl">{t("news.title")}</p>
        <p className="mt-1 text-sm text-white/70">{t("news.text")}</p>
      </div>
      {state === "done" ? (
        <p className="text-sm">{t("news.thanks")}</p>
      ) : (
        <form onSubmit={submit} className="flex w-full max-w-md gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            placeholder="your@email.com"
            className="min-w-0 flex-1 rounded-md px-3 py-2.5 text-sm text-ink outline-none"
          />
          <button
            disabled={state === "sending"}
            className="rounded-md bg-[#AD8A4E] px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            {state === "sending" ? "…" : t("news.button")}
          </button>
        </form>
      )}
      {state === "error" && <p className="text-xs text-red-200">{t("news.error")}</p>}
    </div>
  );
}
