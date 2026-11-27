import { Metadata } from "next";
import { getAllProducts } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import T from "@/components/T";
import { searchProducts } from "@/lib/shop";

// Search results page (update 117). Not indexed by Google.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").slice(0, 80);
  const found = q ? searchProducts(await getAllProducts(), q) : [];

  return (
    <div>
      <Breadcrumbs items={[{ href: "/", labelKey: "crumb.home" }, { labelKey: "search.title" }]} />
      <h1 className="font-serif text-3xl">
        <T k="search.title" />
        {q ? `: “${q}”` : ""}
      </h1>
      <form action="/search" className="mt-4 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          className="min-w-0 flex-1 rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-ink px-4 py-2 text-sm text-white">
          <T k="search.button" />
        </button>
      </form>
      {q && (
        <p className="mt-4 text-sm text-muted">
          {found.length} <T k="search.results" />
          {found.length === 0 && (
            <>
              {" — "}
              <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">
                <T k="search.askUs" />
              </a>
            </>
          )}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {found.map((p) => (
          <ProductCard key={p.slug} product={p} hideFromImageSearch />
        ))}
      </div>
    </div>
  );
}
