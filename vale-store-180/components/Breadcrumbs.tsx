import Link from "next/link";
import T from "@/components/T";

// Update 116: Home › Category › Type — also sent to Google as BreadcrumbList.
export type Crumb = { href?: string; labelKey?: string; label?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      {items.map((c, i) => {
        const text = c.labelKey ? <T k={c.labelKey} /> : c.label;
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-ink transition-colors">
                {text}
              </Link>
            ) : (
              <span className={last ? "text-ink" : ""}>{text}</span>
            )}
            {!last && <span aria-hidden>›</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function breadcrumbJsonLd(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: `https://www.charmchase.co.uk${c.url}` } : {}),
    })),
  };
}
