import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getProduct } from "@/lib/data";
import { formatPrice } from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import ProductInfoPanel from "@/components/ProductInfoPanel";
import BackLink from "@/components/BackLink";

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
  const shortDescription =
    product.description.length > 155
      ? product.description.slice(0, 152) + "..."
      : product.description;
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

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string; canceled?: string };
}) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

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
      <div className="grid gap-10 sm:grid-cols-2">
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
