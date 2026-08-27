import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about buying antiques from CharmChase — condition, shipping, returns, and payment.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Are your items genuine antiques and vintage pieces?",
    a: "Yes. Every piece we list is sourced in person from estate clearances, local auctions and private sales across Worcestershire, Oxfordshire and Warwickshire — we don't buy in bulk from importers. Each item's era, style and condition are described as accurately as we can.",
  },
  {
    q: "What condition are the items in?",
    a: "Our pieces are antique, vintage or second-hand, and are described and photographed as accurately as possible, including any age-related wear, marks or imperfections. This wear is normal for genuine antiques and isn't grounds for a return unless it wasn't disclosed in the listing.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes, we ship across the UK and internationally. For orders shipped outside the UK, your order may be subject to import duties, taxes and customs processing fees charged by your country's customs authority — these are not included in the item price or shipping cost and are the buyer's responsibility.",
  },
  {
    q: "How much does shipping cost?",
    a: "Estimated shipping is shown on each product page, with separate UK and international rates where applicable. You'll see the final shipping cost at checkout before you pay.",
  },
  {
    q: "What is your returns policy?",
    a: "Under the Consumer Contracts Regulations 2013, you have 14 days from receiving your item to cancel your order, and a further 14 days to send it back once you've told us. Return postage is on you unless the item arrived faulty, damaged, or not as described — in that case we cover it. See our full Returns & Refunds policy for details.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept payment by card and other methods offered at checkout, processed securely through Stripe. You'll see all available options when you click Buy now.",
  },
  {
    q: "Can I ask a question about an item before buying?",
    a: "Of course — message us on WhatsApp or use the enquiry form on any product page. We're happy to answer questions about condition, dimensions, or history before you buy.",
  },
  {
    q: "Do you buy antiques, or offer house clearances?",
    a: "We regularly source from house clearances and estate sales. If you have antique furniture, jewellery, decor or art you're looking to sell, or a property that needs clearing, get in touch via WhatsApp to discuss.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="font-serif text-3xl">Frequently Asked Questions</h1>

      <div className="mt-8 space-y-6">
        {faqs.map((f) => (
          <div key={f.q}>
            <h2 className="text-sm font-medium text-ink">{f.q}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Still have a question?{" "}
        <a
          href="https://wa.me/447918527790"
          target="_blank"
          rel="noreferrer"
          className="text-ink underline underline-offset-2"
        >
          Message us on WhatsApp
        </a>{" "}
        or read our{" "}
        <Link href="/returns" className="text-ink underline underline-offset-2">
          Returns &amp; Refunds policy
        </Link>
        .
      </p>
    </div>
  );
}
