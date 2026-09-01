import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with CharmChase — 51 High Street, Evesham, Worcestershire, or message us on WhatsApp.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl">Contact Us</h1>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        Come and see us in person, or get in touch online — whichever is
        easiest for you.
      </p>

      <div className="mt-8 space-y-1 text-sm text-ink">
        <p className="font-medium">CharmChase</p>
        <p className="text-muted">51 High Street</p>
        <p className="text-muted">Evesham, Worcestershire</p>
        <p className="text-muted">United Kingdom</p>
        <p className="mt-2">
          <a
            href="mailto:CharmChaseuk@gmail.com"
            className="text-ink underline underline-offset-2"
          >
            CharmChaseuk@gmail.com
          </a>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="https://wa.me/447918527790"
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-ink px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity"
        >
          Message us on WhatsApp
        </a>
        <a
          href="mailto:CharmChaseuk@gmail.com"
          className="inline-block rounded-md border border-border-strong px-6 py-3 text-sm text-ink hover:bg-surface transition-colors"
        >
          Email us
        </a>
      </div>

      <div className="mt-10 aspect-video w-full overflow-hidden rounded-xl border border-border">
        <iframe
          title="CharmChase location — 51 High Street, Evesham"
          src="https://maps.google.com/maps?q=51%20High%20Street%2C%20Evesham%2C%20Worcestershire%2C%20UK&output=embed"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
    </div>
  );
}
