import Link from "next/link";
import Image from "next/image";
import heroPhoto from "@/public/images/hero.jpg";
import { isAvailable, POPULAR_TAGS, matchesTag } from "@/lib/shop";
import { getAllCategories, getAllProducts } from "@/lib/data";
import CategoryTile from "@/components/CategoryTile";
import ProductCard from "@/components/ProductCard";
import PaidBanner from "@/components/PaidBanner";
import T from "@/components/T";
import NewsletterSignup from "@/components/NewsletterSignup";
import { resolveCategoryPhotos } from "@/lib/categoryPhotos";
import type { Metadata } from "next";

// Always fetch fresh data — without this, deletes/edits made in the admin
// panel can take a while to show up on the live site because Next.js may
// cache this page's data.
// Google Lens / Images: photos shown here are small previews — the real home
// of each photo is its product page, so Google must not index them from here
// (otherwise a picture search leads to this page instead of the item). Update 114.
export const metadata: Metadata = {
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, noimageindex: true } },
};

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
  const available = products.filter(isAvailable);
  const categoryPhotos = await resolveCategoryPhotos(products, categories.map((c) => c.slug));
  // Update 116: 12 newest pieces in stock; sold ones get their own row.
  const newest = available.slice(0, 12);
  const recentlySold = products.filter((p) => p.status === "sold").slice(0, 6);
  // Update 121: popular types across all categories (only those in stock).
  const popularTags = POPULAR_TAGS.filter((t) => available.some((p) => matchesTag(p, t)));

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

      {/* Update 116: lower hero with the headline and a button on the photo,
          so the pieces for sale are visible straight away. */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-xl bg-[#CFC6B7] sm:h-[320px] lg:-mt-4 lg:h-[190px]">
        <Image
          src={heroPhoto}
          alt="A warm, light-filled living room styled with vintage and contemporary furniture"
          fill
          priority
          placeholder="blur"
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center px-6 text-white sm:px-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/85">
            <T k="home.location" />
          </p>
          <h1 className="mt-2 font-serif text-[26px] leading-tight sm:text-4xl lg:text-[30px]">
            <T k="home.headline1" />
            <br />
            <T k="home.headline2" />
          </h1>
          <div className="mt-5 lg:mt-4">
            <Link
              href="/new"
              className="inline-block rounded-md bg-white px-5 py-2.5 text-sm text-ink transition-colors hover:bg-surface"
            >
              <T k="home.shopNew" /> →
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs tracking-widest text-muted lg:mt-6">
        <T k="home.shopByCategory" />
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
        {categories.map((c) => (
          <CategoryTile key={c.slug} category={c} photo={categoryPhotos[c.slug]} />
        ))}
      </div>

      {/* Update 121: popular types — one tap straight to e.g. all rings. */}
      {popularTags.length > 0 && (
        <>
          <p className="mt-10 text-xs tracking-widest text-muted">
            <T k="home.popular" />
          </p>
          <div className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {popularTags.map((t) => (
              <Link
                key={t.key}
                href={`/category/${t.category}?tag=${t.key}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-border-strong bg-white px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-16 flex items-baseline justify-between">
        <p className="text-xs tracking-widest text-muted">
          <T k="home.newArrivals" />
        </p>
        <Link href="/new" className="text-sm text-muted hover:text-ink">
          <T k="home.viewAll" /> →
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {newest.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>

      {recentlySold.length > 0 && (
        <>
          <div className="mt-16 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs tracking-widest text-muted">
              <T k="home.recentlySold" />
            </p>
            <a
              href="https://wa.me/447918527790"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted hover:text-ink"
            >
              <T k="home.lookingSimilar" /> →
            </a>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {recentlySold.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </>
      )}

      <NewsletterSignup />
    </div>
  );
}
