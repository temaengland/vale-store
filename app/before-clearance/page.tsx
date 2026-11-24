import { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClearanceLeadForm from "@/components/ClearanceLeadForm";

// Update 171 (copy reworked in 172): landing page for Facebook / local adverts.
// CharmChase BUYS valuables before a house is cleared — we don't do clearances ourselves.
export const metadata: Metadata = {
  title: "Before the House Clearance — We Buy Antiques & Valuables",
  description:
    "Clearing a house? Call an antiques buyer first. We visit for free, pick out what's worth money, make an offer and pay on the day. Worcestershire, Gloucestershire, Warwickshire and Oxfordshire.",
  alternates: { canonical: "/before-clearance" },
  openGraph: {
    title: "Call us before the clearance company",
    description:
      "Free visit, honest offer, paid on the day. CharmChase Antiques, 51 High Street, Evesham — buying across Worcestershire, Gloucestershire, Warwickshire and Oxfordshire.",
  },
};

const WA =
  "https://wa.me/447918527790?text=" +
  encodeURIComponent("Hello, a house is being cleared and I'd like you to have a look at some items first.");

const AREAS = "Worcestershire, Gloucestershire, Warwickshire and Oxfordshire";

// Update 175: gentle, no criticism of clearance companies.
const without = [
  "Everything leaves the house together, in one go.",
  "Furniture, jewellery and silver can easily go out with everything else.",
  "Nobody has had a proper look at what might be worth money.",
];
const withUs = [
  "We look through the home first and tell you honestly what's worth money.",
  "If you'd like to sell, you get a fair offer and are paid on the day.",
  "Then the clearance goes ahead as planned — with less to take away.",
];

const why: [string, string][] = [
  ["Free visit, no obligation", "We come to the property and look through everything. If you don't want to sell, that's absolutely fine."],
  ["Paid on the day", "Agree a price and we pay you there and then — no waiting for an auction, no commission."],
  ["A real local shop", "CharmChase Antiques is at 51 High Street, Evesham. You deal with us directly, not a call centre."],
  ["Honest and discreet", "We know this can be a difficult time. We take our time and explain what things are and what they're worth."],
];

const steps: [string, string][] = [
  ["1. Tell us about the house", "Fill in the short form on this page or WhatsApp us. Photos help, but aren't needed."],
  ["2. We arrange a visit", "We call you back, usually the same day, and come at a time that suits you — before the clearance."],
  ["3. Offer and payment", "We value the items on the spot. Accept the offer and you're paid on the day."],
];

const tick = (t: string, mark = "✓", color = "text-[#AD8A4E]") => (
  <li key={t} className="flex items-start gap-2">
    <span className={`mt-0.5 shrink-0 ${color}`}>{mark}</span>
    <span>{t}</span>
  </li>
);

export default function BeforeClearancePage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ href: "/", labelKey: "crumb.home" }, { href: "/sell", label: "We buy antiques" }, { label: "Before the clearance" }]}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <div>
          <p className="text-xs tracking-widest text-[#AD8A4E]">BEFORE YOU BOOK A HOUSE CLEARANCE</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Call us before the clearance company.</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            We&apos;re antiques buyers, not a clearance firm. Before a house is emptied, we come and look through it, pick
            out the things that are worth money — furniture, jewellery, gold, silver, watches, clocks, china, pictures —
            make you an offer and pay you on the day. Everything else can then be cleared as you planned.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-ink">
            {["Free visit — no obligation", "Honest offer on the spot", "Paid on the day"].map((t) => tick(t))}
          </ul>
          <p className="mt-5 text-sm text-muted">We travel across {AREAS}.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={WA} target="_blank" rel="noreferrer" className="rounded-md bg-[#25D366] px-5 py-2.5 text-sm text-white">
              WhatsApp us
            </a>
            <a href="tel:+447918527790" className="rounded-md border border-ink px-5 py-2.5 text-sm text-ink">
              Call 07918 527790
            </a>
          </div>
        </div>

        <div id="form">
          <p className="mb-3 font-serif text-xl text-ink">Request a free visit</p>
          <ClearanceLeadForm />
        </div>
      </div>

      <h2 className="mt-14 font-serif text-2xl text-ink">What does &ldquo;buying before the clearance&rdquo; mean?</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Whether a family home is being cleared, someone is moving into care or downsizing, it&apos;s worth having
        things looked at first. We value what&apos;s there, buy anything you&apos;d like to sell, and leave the rest for
        whoever is doing the clearance.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <p className="font-serif text-lg text-ink">Straight to the clearance</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">{without.map((t) => tick(t, "•", "text-muted"))}</ul>
        </div>
        <div className="rounded-xl border border-[#AD8A4E] bg-surface p-5">
          <p className="font-serif text-lg text-ink">CharmChase first, then the clearance</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">{withUs.map((t) => tick(t))}</ul>
        </div>
      </div>

      <h2 className="mt-14 font-serif text-2xl text-ink">Why sell to us?</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {why.map(([t, d]) => (
          <div key={t} className="rounded-xl bg-surface p-5">
            <p className="font-serif text-lg text-ink">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-serif text-2xl text-ink">How it works</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-border p-5">
            <p className="font-serif text-lg text-ink">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-sm font-medium tracking-widest text-ink">WHAT WE LOOK FOR</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
        Antique and good-quality furniture · gold, silver and costume jewellery · hallmarked silver and cutlery · clocks
        and watches, working or not · coins and medals · porcelain, glass and pottery · paintings, prints and mirrors ·
        collectables, militaria and unusual objects. Not sure? Ask — we&apos;re happy to look.
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Please note: we don&apos;t empty properties ourselves — we buy the items of value. The rest can go to your
        clearance company, family or charity as planned.
      </p>

      <div className="mt-12 rounded-xl bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between">
        <p className="font-serif text-xl">Before anything goes to the clearance or a skip, let us take a look.</p>
        <a href="#form" className="mt-4 inline-block shrink-0 rounded-md bg-white px-5 py-2.5 text-sm text-ink sm:ml-6 sm:mt-0">
          Request a free visit
        </a>
      </div>
    </div>
  );
}
