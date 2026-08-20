import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import InquiryForm from "@/components/InquiryForm";
import BuyNowButton from "@/components/BuyNowButton";
import ExpandableDescription from "@/components/ExpandableDescription";

// Always fetch fresh data — see note on the homepage for why this matters.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
      <ProductGallery
        images={product.images}
        legacyImage={product.image}
        icon={product.icon}
        alt={product.name}
      />
      <div>
        <p className="text-xs tracking-widest text-muted uppercase">
          {product.subcategory ?? product.category}
          {product.era ? ` · ${product.era}` : ""}
        </p>
        <h1 className="mt-2 font-serif text-3xl">{product.name}</h1>
        <p className="mt-3 text-lg text-muted">
          {formatPrice(product.price)}
        </p>
        {((typeof product.shipping_cost === "number" && product.shipping_cost > 0) ||
          (typeof product.international_shipping_cost === "number" &&
            product.international_shipping_cost > 0)) && (
          <div className="mt-1 text-xs text-muted">
            {typeof product.shipping_cost === "number" &&
              product.shipping_cost > 0 && (
                <p>+ {formatPrice(product.shipping_cost)} estimated UK shipping</p>
              )}
            {typeof product.international_shipping_cost === "number" &&
              product.international_shipping_cost > 0 && (
                <p>
                  + {formatPrice(product.international_shipping_cost)} estimated
                  international shipping
                </p>
              )}
            <p className="mt-1">
              Import duties and taxes for international orders are set by
              your local customs authority and are the buyer's
              responsibility.
            </p>
          </div>
        )}
        <div className="mt-6">
          <ExpandableDescription text={product.description} />
        </div>

        {product.status && product.status !== "available" ? (
          <div className="mt-8">
            <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink">
              {product.status === "sold"
                ? "This piece has sold."
                : "This piece isn't currently available."}
            </p>
            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              ASK ABOUT SIMILAR PIECES
              <span className="h-px flex-1 bg-border" />
            </div>
            <InquiryForm product={product} />
          </div>
        ) : searchParams.paid ? (
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
