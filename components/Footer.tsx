"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

// Update 116: full footer — address, contacts, help links, payments.
function PayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border-strong bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink">
      {children}
    </span>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl text-ink">CharmChase</p>
          <p className="mt-2 leading-relaxed">{t("footer.tagline")}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-widest text-ink">{t("footer.visit")}</p>
          <p className="leading-relaxed">
            51 High Street
            <br />
            Evesham, Worcestershire
            <br />
            United Kingdom
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-widest text-ink">{t("footer.help")}</p>
          <div className="flex flex-col gap-1.5">
            <Link href="/about" className="hover:text-ink transition-colors">{t("nav.about")}</Link>
            <Link href="/contact" className="hover:text-ink transition-colors">{t("footer.contact")}</Link>
            <Link href="/faq" className="hover:text-ink transition-colors">{t("footer.faq")}</Link>
            <Link href="/sell" className="hover:text-ink transition-colors">{t("nav.sell")}</Link>
            <Link href="/returns" className="hover:text-ink transition-colors">{t("footer.returns")}</Link>
            <Link href="/privacy" className="hover:text-ink transition-colors">{t("footer.privacy")}</Link>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-widest text-ink">{t("footer.getInTouch")}</p>
          <div className="flex flex-col gap-1.5">
            <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              WhatsApp +44 7918 527790
            </a>
            <a href="mailto:CharmChaseuk@gmail.com" className="hover:text-ink transition-colors">
              CharmChaseuk@gmail.com
            </a>
            <a href="https://www.instagram.com/charmchaseuk/" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Instagram @charmchaseuk
            </a>
          </div>
          <p className="mt-4 text-xs">🔒 {t("footer.securePayments")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PayBadge>VISA</PayBadge>
            <PayBadge>Mastercard</PayBadge>
            <PayBadge>Amex</PayBadge>
            <PayBadge>Apple Pay</PayBadge>
            <PayBadge>Google Pay</PayBadge>
            <PayBadge>Klarna</PayBadge>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted">
          &copy; {new Date().getFullYear()} CharmChase. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
