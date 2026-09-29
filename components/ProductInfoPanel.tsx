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
import { extractDimensions, ukDeliveryLines } from "@/lib/shop";

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
  const isForSale = !product.status || product.status === "available";
  // Update 116: dimensions shown on their own, not hidden under "Show more".
  const dims = extractDimensions(product.description);

  // Update 125 (computers only, lg+): the blocks below are re-ordered with CSS
  // `order` — title, price, Buy now / Add to cart, one tidy facts block with line
  // icons, description, then a quiet "ask" row. Phones keep the old order.
  return (
    <div className="lg:flex lg:flex-col">
      <p className="text-xs tracking-widest text-muted uppercase lg:order-1">
        {product.subcategory ?? product.category}
        {product.era ? ` · ${product.era}` : ""}
      </p>
      <h1 className="mt-2 font-serif text-3xl lg:order-2 lg:text-[25px] lg:leading-snug">{displayName}</h1>
      <p className="mt-3 text-lg text-muted lg:order-3 lg:text-2xl lg:text-ink">{formatPrice(product.price)}</p>

      <div className="mt-3 space-y-1 text-sm text-muted lg:hidden">
        {/* Update 126: the same Royal Mail options the buyer gets at checkout. */}
        {ukDeliveryLines(product).lines.map((l, i) => (
          <p key={i}>
            {i === 0 ? "🚚 " : <span className="inline-block w-[1.35em]" />}
            {l.label}
            {l.price !== null && (
              <>
                {" — "}
                <span className="text-ink font-medium">{l.price === 0 ? "Free" : formatPrice(l.price)}</span>
              </>
            )}
          </p>
        ))}
        {typeof product.international_shipping_cost === "number" &&
        product.international_shipping_cost > 0 ? (
          <p>✈️ {t("product.international")}: <span className="text-ink font-medium">{formatPrice(product.international_shipping_cost)}</span></p>
        ) : isForSale ? (
          <p>
            🌍 {t("product.outsideUk")} —{" "}
            <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">
              {t("product.askUs")}
            </a>
          </p>
        ) : null}
        {typeof product.shipping_cost === "number" && product.shipping_cost > 0 && (
          <p className="text-xs">Local collection welcome — <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">message us on WhatsApp</a></p>
        )}
      </div>
      <DesktopFacts product={product} isForSale={isForSale} />
      {dims && (
        <dl className="mt-5 lg:order-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface px-4 py-3 text-sm sm:grid-cols-3">
          {dims.map((d) => (
            <div key={d.label + d.value}>
              <dt className="text-[10.5px] uppercase tracking-widest text-muted">{d.label}</dt>
              <dd className="text-ink">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-6 lg:order-7 lg:mt-5">
        <ExpandableDescription text={displayDescription} />
      </div>

      {product.status && product.status !== "available" ? (
        <div className="mt-8 lg:order-8">
          <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink">
            {product.status === "sold" ? t("product.sold") : t("product.unavailable")}
          </p>

          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-6">
              <p className="text-xs tracking-widest text-muted">
                {t("product.alsoLike")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} hideFromImageSearch />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs tracking-widest text-muted">
              {t("product.wantSimilar")}
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
        <div className="lg:order-4">
          <ProductPaidBanner slug={product.slug} />
        </div>
      ) : (
        <div className="mt-8 lg:contents">
          <div className="lg:order-4 lg:mt-4 lg:flex lg:gap-2.5 lg:[&>*]:min-w-0 lg:[&>*:first-child]:flex-[1.4] lg:[&>*:last-child]:flex-1">
            <BuyNowButton slug={product.slug} price={product.price} />
            <div className="mt-3 lg:mt-0">
              <AddToCartButton slug={product.slug} />
            </div>
          </div>
          {canceled && (
            <p className="mt-2 text-sm text-muted lg:order-4">{t("product.cancelled")}</p>
          )}

          {/* Update 116: reassurance right under the buy buttons. */}
          <ul className="mt-4 lg:hidden grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border px-4 py-3 text-[13px] text-ink sm:grid-cols-2">
            <li>🔒 {t("trust.secure")}</li>
            <li>
              ↩{" "}
              <a href="/returns" className="underline-offset-2 hover:underline">
                {t("trust.returns")}
              </a>
            </li>
            <li>📦 {t("trust.delivery")}</li>
            <li>✓ {t("trust.inspected")}</li>
          </ul>

          <div className="my-6 flex items-center gap-3 text-xs text-muted lg:hidden">
            <span className="h-px flex-1 bg-border" />
            {t("product.orAskFirst")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="lg:order-8">
            <InquiryForm product={product} displayName={displayName} compactOnDesktop />
          </div>
        </div>
      )}
    </div>
  );
}

// Update 125: delivery + reassurance as one tidy block with thin gold line
// icons (computers only; phones keep the original lines).
function FactIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-[#AD8A4E]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  van: "M3 7h11v9H3zM14 10h4l3 3v3h-7M5.2 17.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0M15.2 17.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0",
  globe: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17",
  lock: "M7 10.5h10a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2ZM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5",
  returns: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4",
  shield: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6zM8.5 12l2.5 2.5 4.5-5",
  pin: "M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11ZM12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5",
};

function DesktopFacts({ product, isForSale }: { product: Product; isForSale: boolean }) {
  const { t } = useLanguage();
  const hasIntl =
    typeof product.international_shipping_cost === "number" && product.international_shipping_cost > 0;
  return (
    <div className="hidden lg:order-5 lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-2.5 lg:border-b lg:border-border lg:pb-4 lg:text-[13.5px] lg:text-ink">
      {/* Update 126: exactly the Royal Mail options offered at checkout. */}
      <div className="col-span-2 flex items-start gap-2.5">
        <FactIcon d={ICONS.van} />
        <div className="space-y-0.5">
          {ukDeliveryLines(product).lines.map((l, i) => (
            <p key={i} className={i > 0 ? "text-muted" : ""}>
              {l.label}
              {l.price !== null && (
                <>
                  {" "}
                  <span className="font-medium text-ink">{l.price === 0 ? "Free" : formatPrice(l.price)}</span>
                </>
              )}
            </p>
          ))}
        </div>
      </div>
      {hasIntl ? (
        <div className="flex items-center gap-2.5">
          <FactIcon d={ICONS.globe} />
          <span>
            {t("product.international")} <span className="font-medium">{formatPrice(product.international_shipping_cost as number)}</span>
          </span>
        </div>
      ) : isForSale ? (
        <div className="flex items-center gap-2.5">
          <FactIcon d={ICONS.globe} />
          <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {t("product.outsideUk")}
          </a>
        </div>
      ) : null}
      {isForSale && (
        <>
          <div className="flex items-center gap-2.5">
            <FactIcon d={ICONS.lock} />
            <span>{t("trust.secure")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <FactIcon d={ICONS.returns} />
            <a href="/returns" className="underline-offset-2 hover:underline">{t("trust.returns")}</a>
          </div>
          <div className="flex items-center gap-2.5">
            <FactIcon d={ICONS.pin} />
            <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              Collection in Evesham
            </a>
          </div>
        </>
      )}
    </div>
  );
}
