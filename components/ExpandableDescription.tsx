"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

export default function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  // Only worth collapsing if the text is actually long — short
  // descriptions just render plainly with no toggle at all.
  const isLong = text.length > 320;

  return (
    <div>
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-muted ${
          !expanded && isLong ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-ink underline underline-offset-2"
        >
          {expanded ? t("product.showLess") : t("product.showMore")}
        </button>
      )}
    </div>
  );
}
