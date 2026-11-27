"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@/lib/products";
import { CategoryIcon, categoryTileBg } from "@/components/CategoryIcon";
import { useLanguage } from "@/lib/language-context";

// Update 121 (variant "A2"): square photo of one of our real pieces, the
// category name underneath in the logo's serif typeface, larger size.
function splitName(name: string): string[] {
  const i = name.indexOf("&");
  if (i < 0) return [name];
  return [name.slice(0, i + 1).trim(), name.slice(i + 1).trim()];
}

export default function CategoryTile({
  category,
  photo,
}: {
  category: Category;
  count?: number;
  photo?: string | null;
}) {
  const { t } = useLanguage();
  const bg = categoryTileBg[category.slug] ?? "#EDE6D8";
  return (
    <Link href={`/category/${category.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface lg:aspect-[4/3]">
        {photo ? (
          <Image
            src={photo}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 190px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: bg }}>
            <CategoryIcon slug={category.slug} className="h-3/5 w-3/5" />
          </div>
        )}
      </div>
      {/* Update 123: on computers the name is centred and two-part names
          break after "&" ("Watches &" / "Clocks") so neighbours don't run
          together. Phones and tablets are unchanged. */}
      <p className="mt-2.5 font-serif text-lg leading-tight text-ink sm:text-[19px] lg:text-center">
        {splitName(t(`category.name.${category.slug}`)).map((part, i) =>
          i === 0 ? (
            <span key={i}>{part}</span>
          ) : (
            <span key={i} className="lg:block">
              {" "}
              {part}
            </span>
          )
        )}
      </p>
    </Link>
  );
}
