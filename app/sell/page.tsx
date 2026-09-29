import { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

// Update 117: "We buy antiques / house clearance" — for people selling.
export const metadata: Metadata = {
  title: "We Buy Antiques & House Clearance",
  description:
    "Selling antiques or clearing a home in Worcestershire, Oxfordshire or Warwickshire? CharmChase buys furniture, jewellery, silver, watches and art — single pieces or whole estates.",
  alternates: { canonical: "/sell" },
};

const WA =
  "https://wa.me/447918527790?text=" +
  encodeURIComponent("Hello, I have some items I'd like to sell. Here are a few photos:");

export default function SellPage() {
  return (
    <div>
      <Breadcrumbs items={[{ href: "/", labelKey: "crumb.home" }, { label: "We buy antiques" }]} />
      <div className="max-w-2xl">
        <p className="text-xs tracking-widest text-[#AD8A4E]">WE BUY ANTIQUES</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Selling antiques or clearing a home?</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          We buy antique and vintage furniture, jewellery, gold, silver, watches, ceramics and art across Worcestershire,
          Oxfordshire and Warwickshire — a single piece or a whole estate. Fair prices, paid on the day, and an honest
          opinion even if we&apos;re not the right buyer.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          For full house and probate clearances we work through our sister business,{" "}
          <a href="https://www.valeauction.co.uk" target="_blank" rel="noreferrer" className="text-ink underline">
            Vale Auction
          </a>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={WA} target="_blank" rel="noreferrer" className="rounded-md bg-[#25D366] px-5 py-2.5 text-sm text-white">
            Send photos on WhatsApp
          </a>
          <a
            href="https://www.valeauction.co.uk"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-ink px-5 py-2.5 text-sm text-ink"
          >
            Vale Auction →
          </a>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["1. Send photos", "WhatsApp a few pictures of the items, plus any marks, labels or hallmarks."],
          ["2. Get an offer", "We reply quickly with a fair price, or suggest the best way to sell."],
          ["3. We collect & pay", "Local collection and payment on the day — no fuss, no hidden fees."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl bg-surface p-5">
            <p className="font-serif text-lg text-ink">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-medium tracking-widest text-ink">WHAT WE BUY</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Georgian, Victorian and Edwardian furniture · gold and diamond jewellery · hallmarked silver · vintage and antique
        watches · coins and medals · porcelain and glass · paintings and prints · interesting and unusual objects.
      </p>
    </div>
  );
}
