"use client";

import { useEffect, useState } from "react";
import { Product, formatPrice } from "@/lib/products";
import InquiryForm from "@/components/InquiryForm";
import BuyNowButton from "@/components/BuyNowButton";
import AddToCartButton from "@/components/AddToCartButton";
import ProductPaidBanner from "@/components/ProductPaidBanner";
import ExpandableDescription from "@/components/ExpandableDescription";
import ProductCard from "@/components/ProductCard";
import NotifyMeForm from "@/components/NotifyMeForm";
import { useLanguage } from "@/lib/language-context";

export default function ProductInfoPanel({
  product,
  paid,
  canceled,
  relatedProducts,
}: {
  product: Product;
  paid?: string;
  canceled?: string;
  relatedProducts?: Product[];
}) {
  const { t, locale } = useLanguage();

  // Auto-translated name/description (1stDibs-style) — the seller only
  // ever writes these in English; a translation is fetched (and cached
  // server-side) the first time anyone views this product in another
  // language. Falls back to the original English text while loading or if
  // translation isn't available for any reason.
  const [translated, setTranslated] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    setTranslated(null);
    if (locale === "en") return;
    let cancelled = false;
    fetch("/api/translate-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: product.slug, lang: locale }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.name && data.description) {
          setTranslated({ name: data.name, description: data.description });
        }
      })
      .catch(() => {
        /* silently fall back to English */
      });
    return () => {
      cancelled = true;
    };
  }, [locale, product.slug]);

  const displayName = translated?.name ?? product.name;
  const displayDescription = translated?.description ?? product.description;

  return (
    <div>
      <p className="text-xs tracking-widest text-muted uppercase">
        {product.subcategory ?? product.category}
        {product.era ? ` · ${product.era}` : ""}
      </p>
      <h1 className="mt-2 font-serif text-3xl">{displayName}</h1>
      <p className="mt-3 text-lg text-muted">{formatPrice(product.price)}</p>
      {((typeof product.shipping_cost === "number" && product.shipping_cost > 0) ||
        (typeof product.international_shipping_cost === "number" &&
          product.international_shipping_cost > 0)) && (
        <div className="mt-1 text-xs text-muted">
          {typeof product.shipping_cost === "number" &&
            product.shipping_cost > 0 && (
              <p>
                + {formatPrice(product.shipping_cost)}{" "}
                {t("product.estimatedUkShipping")}
              </p>
            )}
          {typeof product.international_shipping_cost === "number" &&
            product.international_shipping_cost > 0 && (
              <p>
                + {formatPrice(product.international_shipping_cost)}{" "}
                {t("product.estimatedIntlShipping")}
              </p>
            )}
          <p className="mt-1">{t("product.customsNote")}</p>
          <p className="mt-1">{t("product.countryTip")}</p>
        </div>
      )}
      <div className="mt-6">
        <ExpandableDescription text={displayDescription} />
      </div>

      {product.status && product.status !== "available" ? (
        <div className="mt-8">
          <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink">
            {product.status === "sold" ? t("product.sold") : t("product.unavailable")}
          </p>

          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-6">
              <p className="text-xs tracking-widest text-muted">
                YOU MIGHT ALSO LIKE
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs tracking-widest text-muted">
              WANT SOMETHING LIKE THIS?
            </p>
            <NotifyMeForm
              category={product.category}
              subcategory={product.subcategory}
              era={product.era}
              productSlug={product.slug}
            />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("product.askSimilar")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <InquiryForm product={product} displayName={displayName} />
        </div>
      ) : paid ? (
        <ProductPaidBanner slug={product.slug} />
      ) : (
        <div className="mt-8">
          <BuyNowButton slug={product.slug} price={product.price} />
          <div className="mt-3">
            <AddToCartButton slug={product.slug} />
          </div>
          {canceled && (
            <p className="mt-2 text-sm text-muted">{t("product.cancelled")}</p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("product.orAskFirst")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <InquiryForm product={product} displayName={displayName} />
        </div>
      )}
    </div>
  );
}
