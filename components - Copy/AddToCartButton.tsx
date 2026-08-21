"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

export default function AddToCartButton({ slug }: { slug: string }) {
  const { addItem, isInCart } = useCart();
  const { t } = useLanguage();
  const inCart = isInCart(slug);

  if (inCart) {
    return (
      <Link
        href="/cart"
        className="block w-full rounded-md border border-ink px-6 py-3 text-center text-sm text-ink hover:bg-surface transition-colors"
      >
        {t("product.inCartViewCart")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addItem(slug)}
      className="w-full rounded-md border border-border-strong px-6 py-3 text-sm text-ink hover:bg-surface transition-colors"
    >
      {t("product.addToCart")}
    </button>
  );
}
