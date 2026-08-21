"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

function buildHref(
  categorySlug: string,
  params: { sub?: string; era?: string }
) {
  const qs = new URLSearchParams();
  if (params.sub) qs.set("sub", params.sub);
  if (params.era) qs.set("era", params.era);
  const query = qs.toString();
  return `/category/${categorySlug}${query ? `?${query}` : ""}`;
}

export default function CategoryFilterRow({
  labelKey,
  axis,
  categorySlug,
  currentSub,
  currentEra,
  options,
}: {
  labelKey: string;
  axis: "sub" | "era";
  categorySlug: string;
  currentSub?: string;
  currentEra?: string;
  options: string[];
}) {
  const { t } = useLanguage();
  const active = axis === "sub" ? currentSub : currentEra;

  function hrefFor(value?: string) {
    return axis === "sub"
      ? buildHref(categorySlug, { sub: value, era: currentEra })
      : buildHref(categorySlug, { sub: currentSub, era: value });
  }

  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-xs tracking-widest text-muted">{t(labelKey)}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefFor(undefined)}
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
            href={hrefFor(o)}
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
