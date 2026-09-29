"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@/lib/products";
import { CategoryIcon, categoryTileBg } from "@/components/CategoryIcon";
import { useLanguage } from "@/lib/language-context";

// Update 119: 1stDibs-style category card — a small photo of one of our real
// pieces on white, the category name beside it, a thin frame. No item count.
export default function CategoryTile({
  category,
  photo,
  className = "",
}: {
  category: Category;
  count?: number;
  photo?: string | null;
  className?: string;
}) {
  const { t } = useLanguage();
  const bg = categoryTileBg[category.slug] ?? "#EDE6D8";
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`group flex items-center gap-2.5 rounded-lg border border-border p-2 transition-colors hover:border-ink sm:gap-3 sm:p-3 ${className}`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white sm:h-16 sm:w-16">
        {photo ? (
          <Image src={photo} alt={category.name} fill sizes="64px" className="object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md" style={{ background: bg }}>
            <CategoryIcon slug={category.slug} className="h-3/5 w-3/5" />
          </div>
        )}
      </div>
      <p className="min-w-0 font-serif text-[14px] leading-snug text-ink sm:text-base">
        {t(`category.name.${category.slug}`)}
      </p>
    </Link>
  );
}
