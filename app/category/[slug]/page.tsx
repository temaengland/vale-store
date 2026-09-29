import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCategory, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CategoryFilterRow from "@/components/CategoryFilterRow";
import T from "@/components/T";
import NotifyMeForm from "@/components/NotifyMeForm";
import { trackCategoryView } from "@/lib/trackView";
import { Suspense } from "react";
import SortSelect from "@/components/SortSelect";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { isAvailable, parseSort, sortForListing, POPULAR_TAGS, matchesTag } from "@/lib/shop";

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
    // Photos here are previews; Google Lens/Images should send people to the
    // item's own page, so images are not indexed from category pages (114).
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, noimageindex: true } },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { sub?: string; era?: string; sort?: string; tag?: string };
}) {
  const category = getCategory(params.slug);
  if (!category) return notFound();

  await trackCategoryView(category.slug);

  const sort = parseSort(searchParams.sort);
  const allInCategory = sortForListing(await getProductsByCategory(category.slug));
  const inStock = allInCategory.filter(isAvailable);
  // Update 116: only show filter buttons that have something in stock
  // (the one currently selected always stays, so it can be switched off).
  const countBy = (key: "subcategory" | "era") => {
    const m: Record<string, number> = {};
    for (const p of inStock) {
      const v = p[key];
      if (v) m[v] = (m[v] || 0) + 1;
    }
    return m;
  };
  const subCounts = countBy("subcategory");
  const eraCounts = countBy("era");
  const subOptions = category.subcategories.filter((s) => subCounts[s] || s === searchParams.sub);
  const eraOptions = (category.eras || []).filter((e) => eraCounts[e] || e === searchParams.era);
  let items = allInCategory;
  if (searchParams.sub) {
    items = items.filter((p) => p.subcategory === searchParams.sub);
  }
  if (searchParams.era) {
    items = items.filter((p) => p.era === searchParams.era);
  }
  // Update 121: ?tag=rings from the homepage "Popular right now" chips.
  const tag = POPULAR_TAGS.find((t) => t.key === searchParams.tag && t.category === category.slug);
  if (tag) items = items.filter((p) => matchesTag(p, tag));

  items = sortForListing(items, sort);
  const shownInStock = items.filter(isAvailable).length;
  const shownSold = items.length - shownInStock;
  const isFiltered = Boolean(searchParams.sub || searchParams.era || tag);
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: category.name, url: `/category/${category.slug}` }])
          ),
        }}
      />
      <Breadcrumbs items={[{ href: "/", labelKey: "crumb.home" }, { labelKey: `category.name.${category.slug}` }]} />
      <h1 className="font-serif text-3xl">
        <T k={`category.name.${category.slug}`} />
      </h1>

      {tag && (
        <p className="mt-3 text-sm text-muted">
          <T k="list.showing" />: <span className="text-ink">{tag.label}</span> ·{" "}
          <Link href={`/category/${category.slug}`} className="underline">
            <T k="list.clear" />
          </Link>
        </p>
      )}

      <div className="mt-5">
        {subOptions.length > 0 && (
        <CategoryFilterRow
          labelKey="category.type"
          axis="sub"
          categorySlug={category.slug}
          currentSub={searchParams.sub}
          currentEra={searchParams.era}
          options={subOptions}
          counts={subCounts}
        />
        )}
        {eraOptions.length > 0 && (
          <CategoryFilterRow
            labelKey="category.era"
            axis="era"
            categorySlug={category.slug}
            currentSub={searchParams.sub}
            currentEra={searchParams.era}
            options={eraOptions}
            counts={eraCounts}
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
        <>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {shownInStock} <T k="list.available" />
            {shownSold > 0 && (
              <>
                {" · "}
                {shownSold} <T k="list.sold" />
              </>
            )}
          </p>
          <Suspense>
            <SortSelect value={sort} />
          </Suspense>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
