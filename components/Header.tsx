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
          <Logo className="h-12 w-auto lg:h-10 min-[1150px]:h-12" />
        </Link>

        {/* Desktop nav — hidden on small screens */}
        <nav className="mx-3 hidden flex-1 justify-center gap-3 whitespace-nowrap text-[13px] text-muted lg:flex min-[1150px]:mx-4 min-[1150px]:gap-4 min-[1150px]:text-sm xl:gap-6 2xl:gap-8">
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

        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          {/* Update 123: WhatsApp always visible on computers — a round icon
              (the full "WhatsApp us" pill didn't fit next to six categories). */}
          <a
            href="https://wa.me/447918527790"
            target="_blank"
            rel="noreferrer"
            aria-label={t("nav.whatsapp")}
            title={t("nav.whatsapp")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-[#25D366] transition-colors hover:border-[#25D366]"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/>
            </svg>
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
