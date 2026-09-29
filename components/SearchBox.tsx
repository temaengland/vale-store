"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/products";
import { useLanguage } from "@/lib/language-context";

type Hit = { slug: string; name: string; price: number; status: string; image: string | null };

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// Update 117: search button in the header → a search panel with live results.
export default function SearchBox() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.results || []);
          setTotal(d.total || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search.open")}
        className="flex h-10 w-10 items-center justify-center text-ink hover:text-muted"
      >
        <SearchIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-0 max-w-2xl bg-white p-4 shadow-xl sm:mt-16 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-border-strong px-4 py-2">
              <SearchIcon />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search.placeholder")}
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
                enterKeyHint="search"
              />
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted" aria-label={t("search.close")}>
                ✕
              </button>
            </form>

            {q.trim().length >= 2 && (
              <div className="mt-3">
                {!loading && hits.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted">
                    {t("search.none")}{" "}
                    <a href="https://wa.me/447918527790" target="_blank" rel="noreferrer" className="underline">
                      {t("search.askUs")}
                    </a>
                  </p>
                ) : (
                  <ul>
                    {hits.map((h) => (
                      <li key={h.slug}>
                        <Link
                          href={`/product/${h.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface"
                        >
                          <span
                            className="h-12 w-12 shrink-0 rounded-md bg-surface bg-contain bg-center bg-no-repeat"
                            style={h.image ? { backgroundImage: `url("/_next/image?url=${encodeURIComponent(h.image)}&w=128&q=70")` } : undefined}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm text-ink">{h.name}</span>
                            <span className="text-xs text-muted">
                              {formatPrice(h.price)}
                              {h.status === "sold" ? ` · ${t("badge.sold")}` : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {total > hits.length && (
                  <button onClick={submit} className="mt-2 w-full rounded-md border border-border-strong py-2 text-sm text-ink hover:border-ink">
                    {t("search.seeAll")} ({total})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
