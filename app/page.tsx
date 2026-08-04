import Link from "next/link";
import Image from "next/image";
import { getAllCategories, getAllProducts } from "@/lib/data";
import CategoryTile from "@/components/CategoryTile";
import ProductCard from "@/components/ProductCard";

export default async function HomePage() {
  const categories = getAllCategories();
  const products = await getAllProducts();
  const furnitureSubcats = categories.find((c) => c.slug === "furniture")!
    .subcategories;

  return (
    <div>
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
        EVESHAM, WORCESTERSHIRE
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">
        Furniture, decor and art
        <br />
        with a history
      </h1>

      <p className="mt-10 text-xs tracking-widest text-muted">
        SHOP BY CATEGORY
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
        <p className="text-xs tracking-widest text-muted">NEW THIS WEEK</p>
        <Link href="/category/furniture" className="text-sm text-muted">
          View all
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
