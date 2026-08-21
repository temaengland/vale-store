import { notFound } from "next/navigation";
import { getCategory, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CategoryFilterRow from "@/components/CategoryFilterRow";
import T from "@/components/T";

// Always fetch fresh data — see note on the homepage for why this matters.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sub?: string; era?: string };
}) {
  const category = getCategory(params.slug);
  if (!category) return notFound();

  let items = await getProductsByCategory(category.slug);
  if (searchParams.sub) {
    items = items.filter((p) => p.subcategory === searchParams.sub);
  }
  if (searchParams.era) {
    items = items.filter((p) => p.era === searchParams.era);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">
        <T k={`category.name.${category.slug}`} />
      </h1>

      <div className="mt-5">
        <CategoryFilterRow
          labelKey="category.type"
          axis="sub"
          categorySlug={category.slug}
          currentSub={searchParams.sub}
          currentEra={searchParams.era}
          options={category.subcategories}
        />
        {category.eras && (
          <CategoryFilterRow
            labelKey="category.era"
            axis="era"
            categorySlug={category.slug}
            currentSub={searchParams.sub}
            currentEra={searchParams.era}
            options={category.eras}
          />
        )}
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
