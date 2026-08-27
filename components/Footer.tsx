"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} CharmChase. {t("footer.rights")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-ink transition-colors">
            {t("nav.about")}
          </Link>
          <Link href="/faq" className="hover:text-ink transition-colors">
            {t("footer.faq")}
          </Link>
          <Link href="/returns" className="hover:text-ink transition-colors">
            {t("footer.returns")}
          </Link>
          <Link href="/privacy" className="hover:text-ink transition-colors">
            {t("footer.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
