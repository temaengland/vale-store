"use client";

import { useState } from "react";
import Link from "next/link";
import { categories } from "@/lib/products";
import Logo from "@/components/Logo";
import CartIcon from "@/components/CartIcon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
        <nav className="hidden gap-8 text-sm text-muted md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://wa.me/447918527790"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border-strong px-4 py-1.5 text-sm hover:text-ink"
          >
            {t("nav.whatsapp")}
          </a>
          <LanguageSwitcher />
          <CartIcon />
        </div>

        {/* Mobile: language + cart + menu button — hidden on desktop */}
        <div className="flex items-center gap-1 md:hidden">
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
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 text-sm md:hidden">
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
          <a
            href="https://wa.me/447918527790"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-full border border-border-strong px-4 py-2.5 text-center text-ink"
          >
            {t("nav.whatsapp")}
          </a>
        </nav>
      )}
    </header>
  );
}
