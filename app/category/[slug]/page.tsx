import { notFound } from "next/navigation";
import { getCategory, getProductsByCategory } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

// Always fetch fresh data — see note on the homepage for why this matters.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

function FilterRow({
  label,
  options,
  active,
  buildHrefFor,
}: {
  label: string;
  options: string[];
  active?: string;
  buildHrefFor: (value?: string) => string;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-xs tracking-widest text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHrefFor(undefined)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
            !active
              ? "border-ink text-ink"
              : "border-border-strong text-muted hover:text-ink"
          }`}
        >
          All
        </Link>
        {options.map((o) => (
          <Link
            key={o}
            href={buildHrefFor(o)}
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
      <h1 className="font-serif text-3xl">{category.name}</h1>

      <div className="mt-5">
        <FilterRow
          label="TYPE"
          options={category.subcategories}
          active={searchParams.sub}
          buildHrefFor={(value) =>
            buildHref(category.slug, { sub: value, era: searchParams.era })
          }
        />
        {category.eras && (
          <FilterRow
            label="ERA"
            options={category.eras}
            active={searchParams.era}
            buildHrefFor={(value) =>
              buildHref(category.slug, { sub: searchParams.sub, era: value })
            }
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
