"use client";

import { useState } from "react";
import Link from "next/link";
import { Product, formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";
import { useLanguage } from "@/lib/language-context";

export default function ProductCard({ product, hideFromImageSearch = false }: { product: Product; hideFromImageSearch?: boolean }) {
  const { t } = useLanguage();
  // Update 125 (computers): hovering shows the second photo. It's only
  // loaded on the first hover, so category pages stay light.
  const second = product.images && product.images.length > 1 ? product.images[1] : null;
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block"
      onMouseEnter={second ? () => setHovered(true) : undefined}
    >
      <div className="relative">
        <ProductImage
          image={product.image}
          images={product.images}
          icon={product.icon}
          alt={product.name}
          className="aspect-square w-full rounded-xl"
          hideFromImageSearch={hideFromImageSearch}
        />
        {second && hovered && (
          <div
            aria-hidden
            className="absolute inset-0 hidden rounded-xl bg-surface bg-contain bg-center bg-no-repeat opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block"
            style={{ backgroundImage: `url("/_next/image?url=${encodeURIComponent(second)}&w=640&q=75")` }}
          />
        )}
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
