"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Product, formatPrice } from "@/lib/products";
import InquiryForm from "@/components/InquiryForm";
import BuyNowButton from "@/components/BuyNowButton";
import AddToCartButton from "@/components/AddToCartButton";
import ProductPaidBanner from "@/components/ProductPaidBanner";
import ExpandableDescription from "@/components/ExpandableDescription";
import ProductCard from "@/components/ProductCard";
import NotifyMeForm from "@/components/NotifyMeForm";
import { useLanguage } from "@/lib/language-context";
import { extractDimensions, cleanDescription } from "@/lib/shop";
import { ukDelivery } from "@/lib/shipping";

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
  // Update 128: hide an eBay-style repeat of the title / a lone "Description"
  // heading at the very start (display only — the saved text is unchanged).
  const displayDescription = cleanDescription(translated?.description ?? product.description, translated?.name ?? product.name);
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
      <p className="mt-3 text-lg text-muted lg:order-3 lg:mt-[18px] lg:text-[21px] lg:font-semibold lg:tracking-[0.01em] lg:text-ink">{formatPrice(product.price)}</p>

      {/* Update 128: Royal Mail delivery card (phones: same place as before). */}
      <div className="mt-4 lg:hidden">
        <DeliveryCard product={product} isForSale={isForSale} />
        {isForSale && (
          <p className="mt-2 text-xs text-muted">Local collection welcome — <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">message us on WhatsApp</a></p>
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
              <Link href="/returns" className="underline-offset-2 hover:underline">
                {t("trust.returns")}
              </Link>
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

// Update 130: Royal Mail delivery card — options and prices come from
// lib/shipping.ts, exactly what Stripe charges at checkout.
function DeliveryCard({ product, isForSale }: { product: Product; isForSale: boolean }) {
  const { t } = useLanguage();
  const d = ukDelivery([product]);
  const intl = product.international_shipping_cost;
  const royalMail = d.kind === "standard" || d.kind === "free";
  const headRight =
    d.kind === "standard"
      ? "UK delivery — choose at checkout"
      : d.kind === "free"
      ? "Free UK delivery"
      : d.kind === "personal"
      ? "Items over £2,500"
      : "Large item";
  return (
    <div className="overflow-hidden rounded-xl border border-border text-sm text-ink">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[#FBF9F5] px-3.5 py-2 text-[12.5px]">
        {royalMail ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            {/* Update 131: thin gold parcel icon (not the Royal Mail logo). */}
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#AD8A4E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
              <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.2l8.5 4.6" />
            </svg>
            Royal Mail
          </span>
        ) : (
          <span className="font-semibold">UK delivery</span>
        )}
        <span className="text-muted">{headRight}</span>
      </div>
      {d.options.map((o) => (
        <div key={o.id} className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0">
          <div>
            {o.title}
            {o.badge && (
              <span className="ml-1.5 inline-block rounded bg-[#FFF1DA] px-1.5 py-px align-[1px] text-[10px] tracking-[0.06em] text-[#8A6420]">{o.badge}</span>
            )}
            <span className="mt-0.5 block text-[12.5px] text-muted">{o.note}</span>
          </div>
          <span className="whitespace-nowrap font-semibold">
            {o.amount === 0 ? (o.id === "arrange" ? "" : "Free") : formatPrice(o.amount)}
          </span>
        </div>
      ))}
      {typeof intl === "number" && intl > 0 ? (
        <div className="flex items-center justify-between gap-3 bg-[#FBF9F5] px-3.5 py-2.5">
          <span>✈️ {t("product.international")}</span>
          <span className="whitespace-nowrap font-semibold">{formatPrice(intl)}</span>
        </div>
      ) : isForSale ? (
        <div className="bg-[#FBF9F5] px-3.5 py-2.5">
          ✈️ {t("product.outsideUk")} —{" "}
          <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">
            {t("product.askUs")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

// Computers: the card under the buy buttons + reassurance with the emoji icons.
function DesktopFacts({ product, isForSale }: { product: Product; isForSale: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="hidden lg:order-5 lg:mt-3.5 lg:block lg:border-b lg:border-border lg:pb-4">
      <DeliveryCard product={product} isForSale={isForSale} />
      {isForSale && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px] text-ink">
          <span>🔒 {t("trust.secure")}</span>
          <Link href="/returns" className="underline-offset-2 hover:underline">↩ {t("trust.returns")}</Link>
          <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">📍 Collection in Evesham</a>
          <span>✓ {t("trust.inspected")}</span>
        </div>
      )}
    </div>
  );
}
