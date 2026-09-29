"use client";

import { useState } from "react";
import Link from "next/link";
import { categories } from "@/lib/products";
import Logo from "@/components/Logo";
import CartIcon from "@/components/CartIcon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SearchBox from "@/components/SearchBox";
import { useLanguage } from "@/lib/language-context";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo className="h-12 w-auto" />
        </Link>

        {/* Desktop nav — hidden on small screens */}
        <nav className="hidden gap-7 whitespace-nowrap text-sm text-muted lg:flex">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="hover:text-ink transition-colors"
            >
              {t(`category.name.${c.slug}`)}
            </Link>
          ))}
          <Link href="/about" className="hover:text-ink transition-colors">
            {t("nav.about")}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="https://wa.me/447918527790"
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap rounded-full border border-border-strong px-4 py-1.5 text-sm hover:text-ink"
          >
            {t("nav.whatsapp")}
          </a>
          <SearchBox />
          <LanguageSwitcher />
          <CartIcon />
        </div>

        {/* Mobile: language + cart + menu button — hidden on desktop */}
        <div className="flex items-center gap-1 lg:hidden">
          <SearchBox />
          <LanguageSwitcher />
          <CartIcon />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
          >
            <span
              className={`block h-[1.5px] w-6 bg-ink transition-transform ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-6 bg-ink transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[1.5px] w-6 bg-ink transition-transform ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 text-sm lg:hidden">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              onClick={() => setOpen(false)}
              className="py-2.5 text-ink"
            >
              {t(`category.name.${c.slug}`)}
            </Link>
          ))}
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className="py-2.5 text-ink"
          >
            {t("nav.about")}
          </Link>
          {/* Update 116: contacts and help pages in the phone menu too. */}
          <div className="mt-1 border-t border-border pt-1">
            {[
              ["/contact", "footer.contact"],
              ["/faq", "footer.faq"],
              ["/returns", "footer.returns"],
              ["/sell", "nav.sell"],
            ].map(([href, key]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="block py-2.5 text-muted">
                {t(key)}
              </Link>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/447918527790"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-full bg-[#25D366] px-4 py-2.5 text-center text-white"
            >
              {t("nav.whatsappShort")}
            </a>
            <a
              href="mailto:CharmChaseuk@gmail.com"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border-strong px-4 py-2.5 text-center text-ink"
            >
              {t("nav.email")}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
