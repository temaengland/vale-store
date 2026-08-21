"use client";

import { useLanguage } from "@/lib/language-context";

export default function T({ k }: { k: string }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
