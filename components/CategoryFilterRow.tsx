"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function CategoryFilterRow({
  labelKey,
  options,
  active,
  buildHrefFor,
}: {
  labelKey: string;
  options: string[];
  active?: string;
  buildHrefFor: (value?: string) => string;
}) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-xs tracking-widest text-muted">{t(labelKey)}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHrefFor(undefined)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
            !active
              ? "border-ink text-ink"
              : "border-border-strong text-muted hover:text-ink"
          }`}
        >
          {t("category.all")}
        </Link>
        {options.map((o) => (
          <Link
            key={o}
            href={buildHrefFor(o)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              active === o
                ? "border-ink text-ink"
                : "border-border-strong text-muted hover:text-ink"
            }`}
          >
            {o}
          </Link>
        ))}
      </div>
    </div>
  );
}
