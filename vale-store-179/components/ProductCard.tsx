"use client";

import Link from "next/link";
import { Product, formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";
import { useLanguage } from "@/lib/language-context";

export default function ProductCard({ product, hideFromImageSearch = false }: { product: Product; hideFromImageSearch?: boolean }) {
  const { t } = useLanguage();
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative">
        <ProductImage
          image={product.image}
          images={product.images}
          icon={product.icon}
          alt={product.name}
          className="aspect-square w-full rounded-xl"
          hideFromImageSearch={hideFromImageSearch}
        />
        {product.status && product.status !== "available" && (
          <span className="absolute right-2 top-2 rounded-full bg-ink px-2.5 py-1 text-xs text-white">
            {product.status === "sold" ? t("badge.sold") : t("badge.unavailable")}
          </span>
        )}
      </div>
      {/* Update 125 (computers): name always 2 lines, so prices line up. */}
      <p className="mt-2 text-sm text-ink lg:line-clamp-2 lg:min-h-[2.5rem]">{product.name}</p>
      <p className="text-sm text-muted lg:mt-1 lg:text-[14.5px] lg:font-medium lg:text-ink">{formatPrice(product.price)}</p>
    </Link>
  );
}
