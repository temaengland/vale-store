import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCategory, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CategoryFilterRow from "@/components/CategoryFilterRow";
import BackLink from "@/components/BackLink";
import T from "@/components/T";
import NotifyMeForm from "@/components/NotifyMeForm";
import { trackCategoryView } from "@/lib/trackView";

// Always fetch fresh data — see note on the homepage for why this matters.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = getCategory(params.slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `Curated antique and vintage ${category.name.toLowerCase()}, sourced from estate sales across Worcestershire, Oxfordshire and Warwickshire.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sub?: string; era?: string };
}) {
  const category = getCategory(params.slug);
  if (!category) return notFound();

  await trackCategoryView(category.slug);

  const allInCategory = await getProductsByCategory(category.slug);
  let items = allInCategory;
  if (searchParams.sub) {
    items = items.filter((p) => p.subcategory === searchParams.sub);
  }
  if (searchParams.era) {
    items = items.filter((p) => p.era === searchParams.era);
  }

  const isFiltered = Boolean(searchParams.sub || searchParams.era);
  const isEmpty = items.length === 0;

  // For an empty filtered view: which other subcategories in this same
  // category actually have something in them right now, so the person has
  // somewhere obvious to go instead of a dead end.
  const subcategoriesWithItems = isEmpty
    ? category.subcategories.filter((s) =>
        allInCategory.some((p) => p.subcategory === s)
      )
    : [];

  return (
    <div>
      <BackLink />
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

      {isEmpty ? (
        <div className="mt-8">
          <p className="max-w-md text-sm leading-relaxed text-muted">
            {isFiltered
              ? "Nothing matches that exact combination right now — our collection is small and hand-picked, and it changes as we source new pieces. Here's what's currently available nearby:"
              : "This category is between finds at the moment — check back soon, or leave your email below and we'll let you know the moment something arrives."}
          </p>

          {subcategoriesWithItems.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {subcategoriesWithItems.map((s) => (
                <Link
                  key={s}
                  href={`/category/${category.slug}?sub=${encodeURIComponent(s)}`}
                  className="rounded-full border border-border-strong px-4 py-2 text-sm text-ink hover:border-ink transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 max-w-sm">
            <NotifyMeForm
              category={category.slug}
              subcategory={searchParams.sub}
              era={searchParams.era}
            />
          </div>

          {allInCategory.length > 0 && (
            <div className="mt-12">
              <p className="text-xs tracking-widest text-muted">
                YOU MIGHT ALSO LIKE
              </p>
              <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {allInCategory.slice(0, 8).map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
