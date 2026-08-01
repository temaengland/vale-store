import Link from "next/link";
import { categories } from "@/lib/products";

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-xl">
          Vale &amp; co
        </Link>
        <nav className="flex gap-8 text-sm text-muted">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="hover:text-ink transition-colors"
            >
              {c.name}
            </Link>
          ))}
          <Link href="/about" className="hover:text-ink transition-colors">
            About
          </Link>
        </nav>
        <a
          href="https://wa.me/440000000000"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border-strong px-4 py-1.5 text-sm hover:text-ink"
        >
          WhatsApp us
        </a>
      </div>
    </header>
  );
}
