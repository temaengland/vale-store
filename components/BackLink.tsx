"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export default function BackLink({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  const { t } = useLanguage();

  function handleBack() {
    // If the previous page was on our own site, go back normally.
    // Otherwise (e.g. returning from Stripe), use the explicit fallback
    // URL — typically the product's category page — so the buyer lands
    // somewhere useful rather than on the homepage or back at checkout.
    const prev = document.referrer;
    const isOurSite =
      prev && new URL(prev).hostname === window.location.hostname;
    if (isOurSite) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
    >
      <ArrowLeftIcon />
      {t("nav.back")}
    </button>
  );
}
