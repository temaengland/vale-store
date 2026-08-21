"use client";

import Link from "next/link";
import { Product, formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";
import { useLanguage } from "@/lib/language-context";

export default function ProductCard({ product }: { product: Product }) {
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
        />
        {product.status && product.status !== "available" && (
          <span className="absolute right-2 top-2 rounded-full bg-ink px-2.5 py-1 text-xs text-white">
            {product.status === "sold" ? t("badge.sold") : t("badge.unavailable")}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink">{product.name}</p>
      <p className="text-sm text-muted">{formatPrice(product.price)}</p>
    </Link>
  );
}
