import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getProduct } from "@/lib/data";
import { formatPrice, Product } from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import ProductInfoPanel from "@/components/ProductInfoPanel";
import BackLink from "@/components/BackLink";
import { trackProductView } from "@/lib/trackView";

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
    },
  };

  return (
    <div>
      <BackLink />
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
        />
        <ProductInfoPanel
          product={product}
          paid={searchParams.paid}
          canceled={searchParams.canceled}
        />
      </div>
    </div>
  );
}
