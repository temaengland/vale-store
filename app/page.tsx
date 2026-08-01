import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import CategoryTile from "@/components/CategoryTile";
import ProductCard from "@/components/ProductCard";
import { ItemIllustration } from "@/components/ItemIllustration";

export default async function HomePage() {
  const categories = getAllCategories();
  const products = await getAllProducts();
  const furnitureSubcats = categories.find((c) => c.slug === "furniture")!
    .subcategories;

  return (
    <div>
      <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-[#EDE6DA] text-[#A89A82]">
        <ItemIllustration icon="sofa" className="h-1/3 w-1/3 opacity-60" />
      </div>

      <p className="mt-8 text-xs tracking-widest text-muted">
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
