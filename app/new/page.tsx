import { Metadata } from "next";
import { Suspense } from "react";
import { getAllProducts } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { isAvailable, parseSort, sortForListing } from "@/lib/shop";

// Update 116: "New arrivals" — every piece, newest first, sold ones at the end.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "New arrivals",
  description:
    "The latest antique and vintage furniture, jewellery, silver, decor and art at CharmChase, Evesham — newest pieces first.",
  alternates: { canonical: "/new" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, noimageindex: true } },
};

export default async function NewArrivalsPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = parseSort(searchParams.sort);
  const all = await getAllProducts();
  const items = sortForListing(all, sort);
  const availableCount = all.filter(isAvailable).length;

  return (
    <div>
      <Breadcrumbs items={[{ href: "/", labelKey: "crumb.home" }, { labelKey: "home.newArrivalsTitle" }]} />
      <h1 className="font-serif text-3xl">
        <T k="home.newArrivalsTitle" />
      </h1>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {availableCount} <T k="list.available" />
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
    </div>
  );
}
