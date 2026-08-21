"use client";

import Link from "next/link";
import { Category } from "@/lib/products";
import { CategoryIcon, categoryTileBg } from "@/components/CategoryIcon";
import { useLanguage } from "@/lib/language-context";

export default function CategoryTile({
  category,
  count,
}: {
  category: Category;
  count: number;
}) {
  const { t } = useLanguage();
  const bg = categoryTileBg[category.slug] ?? "#EDE6D8";
  return (
    <Link href={`/category/${category.slug}`} className="block">
      <div
        className="flex aspect-square items-center justify-center rounded-xl"
        style={{ background: bg }}
      >
        <CategoryIcon slug={category.slug} className="h-3/5 w-3/5" />
      </div>
      <p className="mt-2.5 font-medium text-ink">
        {t(`category.name.${category.slug}`)}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {count} {t("home.pieces")}
      </p>
    </Link>
  );
}
