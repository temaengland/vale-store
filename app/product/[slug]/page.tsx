import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";
import InquiryForm from "@/components/InquiryForm";
import BuyNowButton from "@/components/BuyNowButton";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string; canceled?: string };
}) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <ProductImage
        image={product.image}
        icon={product.icon}
        alt={product.name}
        className="aspect-square w-full rounded-xl"
      />
      <div>
        <p className="text-xs tracking-widest text-muted uppercase">
          {product.subcategory ?? product.category}
        </p>
        <h1 className="mt-2 font-serif text-3xl">{product.name}</h1>
        <p className="mt-3 text-lg text-muted">
          {formatPrice(product.price)}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          {product.description}
        </p>

        {searchParams.paid ? (
          <p className="mt-8 rounded-md bg-surface px-4 py-3 text-sm text-ink">
            Payment received — thank you! We'll be in touch to arrange
            delivery or collection.
          </p>
        ) : (
          <div className="mt-8">
            <BuyNowButton slug={product.slug} price={product.price} />
            {searchParams.canceled && (
              <p className="mt-2 text-sm text-muted">
                Payment cancelled — no charge was made.
              </p>
            )}

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              OR ASK A QUESTION FIRST
              <span className="h-px flex-1 bg-border" />
            </div>

            <InquiryForm product={product} />
          </div>
        )}
      </div>
    </div>
  );
}
