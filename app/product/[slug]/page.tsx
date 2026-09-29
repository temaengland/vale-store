import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getProduct, getAllProducts } from "@/lib/data";
import { formatPrice, Product } from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import ProductInfoPanel from "@/components/ProductInfoPanel";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import T from "@/components/T";
import { getCategory } from "@/lib/data";
import { isAvailable } from "@/lib/shop";
import { trackProductView } from "@/lib/trackView";
import { productVideo } from "@/lib/productVideo";

// Always fetch fresh data — see note on the homepage for why this matters.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  const image = product.images?.[0] ?? product.image;
  const shortDescription = buildMetaDescription(product);
  return {
    title: `${product.name} — ${formatPrice(product.price)}`,
    description: shortDescription,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: shortDescription,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

// Search engines want meta descriptions roughly 70–155 characters — too
// short (e.g. a brief placeholder description) or too long both get
// flagged. Pad short ones with name/category context; trim long ones.
function buildMetaDescription(product: Product): string {
  const MIN = 70;
  const MAX = 155;
  let text = product.description;

  if (text.length < MIN) {
    const details = [product.era, product.subcategory]
      .filter(Boolean)
      .join(" ");
    const suffix = details
      ? ` ${details} piece from CharmChase, Evesham.`
      : " Available now from CharmChase, Evesham.";
    text = `${product.name} — ${text}.${suffix}`;
  }

  return text.length > MAX ? text.slice(0, MAX - 3) + "..." : text;
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string; canceled?: string };
}) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  // Awaited (not fire-and-forget) — in a serverless environment the
  // function can be frozen right after the response is sent, which would
  // cut off an un-awaited call before it finishes.
  await trackProductView(product.slug);

  // "You might also like" (update 116: for every piece, not only sold ones) —
  // other pieces in stock from the same type, then the same category, then anything.
  const all = await getAllProducts();
  const available = all.filter((p) => p.slug !== product.slug && isAvailable(p));
  const sameSubcategory = product.subcategory
    ? available.filter((p) => p.category === product.category && p.subcategory === product.subcategory)
    : [];
  const sameCategory = available.filter(
    (p) => p.category === product.category && !sameSubcategory.includes(p)
  );
  const others = available.filter((p) => p.category !== product.category);
  const relatedProducts: Product[] = [...sameSubcategory, ...sameCategory, ...others].slice(0, 4);
  const forSale = isAvailable(product);
  const video = await productVideo(product.id);
  const category = getCategory(product.category);

  // Structured data (schema.org Product) — lets Google show price and
  // stock status directly in search results, and helps it understand
  // this page is a product listing rather than plain text.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image:
      product.images && product.images.length > 0
        ? product.images
        : product.image
        ? [product.image]
        : undefined,
    sku: product.slug,
    offers: {
      "@type": "Offer",
      url: `https://www.charmchase.co.uk/product/${product.slug}`,
      priceCurrency: "GBP",
      price: (product.price / 100).toFixed(2),
      availability:
        product.status === "sold"
          ? "https://schema.org/SoldOut"
          : product.status === "unavailable"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: "CharmChase" },
      // Update 116: delivery and returns, so Google can show them in results.
      ...(typeof product.shipping_cost === "number"
        ? {
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: (product.shipping_cost / 100).toFixed(2),
                currency: "GBP",
              },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
            },
          }
        : {}),
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "GB",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
  };

  const crumbs: { href: string; labelKey?: string; label?: string; name: string; url: string }[] = [
    { href: "/", labelKey: "crumb.home", name: "Home", url: "/" },
    { href: `/category/${product.category}`, labelKey: `category.name.${product.category}`, name: category?.name || product.category, url: `/category/${product.category}` },
    ...(product.subcategory
      ? [{ href: `/category/${product.category}?sub=${encodeURIComponent(product.subcategory)}`, label: product.subcategory, name: product.subcategory, url: `/category/${product.category}?sub=${encodeURIComponent(product.subcategory)}` }]
      : []),
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: c.url })))) }}
      />
      <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, labelKey: c.labelKey, label: c.label }))} />
      <div className="grid min-w-0 gap-10 sm:grid-cols-2 [&>*]:min-w-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductGallery
          images={product.images}
          legacyImage={product.image}
          icon={product.icon}
          alt={product.name}
          video={video}
        />
        <ProductInfoPanel
          product={product}
          paid={searchParams.paid}
          canceled={searchParams.canceled}
          relatedProducts={forSale ? [] : relatedProducts}
        />
      </div>

      {forSale && relatedProducts.length > 0 && (
        <div className="mt-16">
          <p className="text-xs tracking-widest text-muted">
            <T k="product.alsoLike" />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.slug} product={p} hideFromImageSearch />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
