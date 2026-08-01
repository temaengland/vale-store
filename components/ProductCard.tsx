import Link from "next/link";
import { Product, formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <ProductImage
        image={product.image}
        icon={product.icon}
        alt={product.name}
        className="aspect-square w-full rounded-xl"
      />
      <p className="mt-2 text-sm text-ink">{product.name}</p>
      <p className="text-sm text-muted">{formatPrice(product.price)}</p>
    </Link>
  );
}
