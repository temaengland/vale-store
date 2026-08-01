import Link from "next/link";
import { Category } from "@/lib/products";
import { ItemIllustration, iconTones, IconName } from "@/components/ItemIllustration";

const categoryIcon: Record<string, IconName> = {
  furniture: "sofa",
  jewelry: "ring",
  decor: "vase",
};

export default function CategoryTile({
  category,
  count,
}: {
  category: Category;
  count: number;
}) {
  const icon = categoryIcon[category.slug] ?? "generic";
  const tone = iconTones[icon];
  return (
    <Link href={`/category/${category.slug}`} className="block">
      <div
        className="flex aspect-square items-center justify-center rounded-xl"
        style={{ background: tone.bg, color: tone.fg }}
      >
        <ItemIllustration icon={icon} className="h-2/5 w-2/5" />
      </div>
      <p className="mt-2.5 font-medium text-ink">{category.name}</p>
      <p className="mt-0.5 text-xs text-muted">{count} pieces</p>
    </Link>
  );
}
