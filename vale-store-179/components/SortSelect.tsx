"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

// Update 116: Newest / Price low→high / Price high→low. Sold items always stay last.
export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useLanguage();

  function change(v: string) {
    const q = new URLSearchParams(params.toString());
    if (v === "newest") q.delete("sort");
    else q.set("sort", v);
    const qs = q.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t("sort.label")}</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        className="rounded-md border border-border-strong bg-white px-3 py-1.5 text-sm text-ink"
      >
        <option value="newest">{t("sort.newest")}</option>
        <option value="price-asc">{t("sort.priceAsc")}</option>
        <option value="price-desc">{t("sort.priceDesc")}</option>
      </select>
    </label>
  );
}
