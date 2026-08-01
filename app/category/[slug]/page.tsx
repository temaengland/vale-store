import { notFound } from "next/navigation";
import { getCategory, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sub?: string };
}) {
  const category = getCategory(params.slug);
  if (!category) return notFound();

  let items = await getProductsByCategory(category.slug);
  if (searchParams.sub) {
    items = items.filter((p) => p.subcategory === searchParams.sub);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">{category.name}</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/category/${category.slug}`}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
            !searchParams.sub
              ? "border-ink text-ink"
              : "border-border-strong text-muted hover:text-ink"
          }`}
        >
          All
        </Link>
        {category.subcategories.map((s) => (
          <Link
            key={s}
            href={`/category/${category.slug}?sub=${encodeURIComponent(s)}`}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              searchParams.sub === s
                ? "border-ink text-ink"
                : "border-border-strong text-muted hover:text-ink"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {items.length === 0 && (
          <p className="col-span-full text-sm text-muted">
            No pieces here yet — check back soon.
          </p>
        )}
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
