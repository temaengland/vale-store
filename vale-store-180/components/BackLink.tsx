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
    // Update 121: if we got here from another page of our site in this tab,
    // go back in history — same list, same scroll place. Otherwise (arrived
    // from Google, or back from Stripe) go to the fallback, e.g. the category.
    let depth = 0;
    try {
      depth = Number(sessionStorage.getItem("cc_nav_depth") || "0");
    } catch {
      depth = 0;
    }
    if (depth > 1 && window.history.length > 1) {
      try {
        sessionStorage.setItem("cc_nav_depth", String(depth - 2));
      } catch {
        /* ignore */
      }
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
