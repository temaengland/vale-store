import Link from "next/link";
import Image from "next/image";
import { getAllCategories, getAllProducts } from "@/lib/data";
import CategoryTile from "@/components/CategoryTile";
import ProductCard from "@/components/ProductCard";
import PaidBanner from "@/components/PaidBanner";
import T from "@/components/T";

// Always fetch fresh data — without this, deletes/edits made in the admin
// panel can take a while to show up on the live site because Next.js may
// cache this page's data.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { paid?: string };
}) {
  const categories = getAllCategories();
  const products = await getAllProducts();
  const furnitureSubcats = categories.find((c) => c.slug === "furniture")!
    .subcategories;

  // LocalBusiness structured data — tells Google this is a real local
  // antiques business, matching the Google Business Profile (same name,
  // address, phone). Helps with local search ("antiques Evesham" etc.)
  // separately from the per-product schema on product pages.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AntiqueStore",
    name: "CharmChase",
    image: "https://www.charmchase.co.uk/images/hero.jpg",
    url: "https://www.charmchase.co.uk",
    telephone: "+447918527790",
    email: "CharmChaseuk@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "51 High Street",
      addressLocality: "Evesham",
      addressRegion: "Worcestershire",
      addressCountry: "GB",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {searchParams.paid && <PaidBanner />}
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl">
        <Image
          src="/images/hero.jpg"
          alt="A warm, light-filled living room styled with vintage and contemporary furniture"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover"
        />
      </div>

      <p className="mt-2 text-right text-[11px] text-muted">
        Photo: Spacejoy / Unsplash
      </p>

      <p className="mt-6 text-xs tracking-widest text-muted">
        <T k="home.location" />
      </p>
      <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
        <T k="home.headline1" />
        <br />
        <T k="home.headline2" />
      </h1>

      <p className="mt-10 text-xs tracking-widest text-muted">
        <T k="home.shopByCategory" />
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((c) => (
          <CategoryTile
            key={c.slug}
            category={c}
            count={products.filter((p) => p.category === c.slug).length}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {furnitureSubcats.map((s) => (
          <Link
            key={s}
            href={`/category/furniture?sub=${encodeURIComponent(s)}`}
            className="rounded-full border border-border-strong px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-16 flex items-baseline justify-between">
        <p className="text-xs tracking-widest text-muted">
          <T k="home.newThisWeek" />
        </p>
        <Link href="/category/furniture" className="text-sm text-muted">
          <T k="home.viewAll" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
