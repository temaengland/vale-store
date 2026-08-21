import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import ProductGallery from "@/components/ProductGallery";
import ProductInfoPanel from "@/components/ProductInfoPanel";

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
      <ProductInfoPanel
        product={product}
        paid={searchParams.paid}
        canceled={searchParams.canceled}
      />
    </div>
  );
}
