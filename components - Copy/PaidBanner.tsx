"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

export default function PaidBanner() {
  const { clear } = useCart();
  const { t } = useLanguage();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cleared.current) {
      clear();
      cleared.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p className="mb-6 rounded-md bg-surface px-4 py-3 text-sm text-ink">
      {t("product.paymentReceived")}
    </p>
  );
}
