"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

export default function ProductPaidBanner({ slug }: { slug: string }) {
  const { removeItem } = useCart();
  const { t } = useLanguage();
  const done = useRef(false);

  useEffect(() => {
    if (!done.current) {
      removeItem(slug);
      done.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p className="mt-8 rounded-md bg-surface px-4 py-3 text-sm text-ink">
      {t("product.paymentReceived")}
    </p>
  );
}
