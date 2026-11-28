"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Product, formatPrice } from "@/lib/products";
import { ProductImage } from "@/components/ItemIllustration";
import { useLanguage } from "@/lib/language-context";

export default function CartPage() {
  const { items, removeItem, clear } = useCart();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/products/by-slugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: items }),
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setError("Couldn't load your cart items."))
      .finally(() => setLoading(false));
  }, [items]);

  const soldOrUnavailable = products.filter(
    (p) => p.status && p.status !== "available"
  );
  const purchasable = products.filter(
    (p) => !p.status || p.status === "available"
  );
  const subtotal = purchasable.reduce((sum, p) => sum + p.price, 0);

  async function handleCheckout() {
    setError("");
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: purchasable.map((p) => p.slug) }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong.");
        setCheckingOut(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — check your connection and try again.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{t("cart.loading")}</p>;
  }

  if (items.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-3xl">{t("cart.title")}</h1>
        <p className="mt-4 text-sm text-muted">
          {t("cart.empty")}{" "}
          <Link href="/" className="underline underline-offset-2">
            {t("cart.continueBrowsing")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">{t("cart.title")}</h1>

      <div className="mt-8 space-y-4">
        {products.map((p) => (
          <div
            key={p.slug}
            className="flex items-center gap-4 rounded-lg border border-border p-3"
          >
            <ProductImage
              image={p.image}
              images={p.images}
              icon={p.icon}
              alt={p.name}
              className="h-20 w-20 shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${p.slug}`}
                className="line-clamp-1 text-sm text-ink hover:underline"
              >
                {p.name}
              </Link>
              <p className="text-sm text-muted">{formatPrice(p.price)}</p>
              {p.status && p.status !== "available" && (
                <p className="mt-1 text-xs text-red-600">
                  {p.status === "sold" ? t("badge.sold") : t("badge.unavailable")} —{" "}
                  {t("cart.removedNotice")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeItem(p.slug)}
              className="text-sm text-muted hover:text-ink"
            >
              {t("cart.remove")}
            </button>
          </div>
        ))}
      </div>

      {soldOrUnavailable.length > 0 && (
        <p className="mt-4 text-xs text-muted">{t("cart.someUnavailable")}</p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <p className="text-sm text-muted">{t("cart.subtotal")}</p>
        <p className="text-lg text-ink">{formatPrice(subtotal)}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{t("cart.shippingNote")}</p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={checkingOut || purchasable.length === 0}
        className="mt-6 w-full rounded-md bg-ink px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {checkingOut
          ? t("cart.redirecting")
          : `${t("cart.checkout")} — ${formatPrice(subtotal)}`}
      </button>
      <button
        type="button"
        onClick={clear}
        className="mt-3 w-full text-center text-xs text-muted hover:text-ink"
      >
        {t("cart.emptyCartButton")}
      </button>
    </div>
  );
}
