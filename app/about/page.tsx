import { Metadata } from "next";
import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";

// Update 117: your own photo on the About page. Put a photo at
// public/images/about.jpg (landscape, ~1600px wide) and it appears here;
// without it the page simply has no photo.
const HAS_PHOTO = fs.existsSync(path.join(process.cwd(), "public", "images", "about.jpg"));

export const metadata: Metadata = {
  title: "About Us",
  description:
    "CharmChase is a curated antiques and vintage business in Evesham, Worcestershire, sourcing furniture, jewellery, decor and art from estate sales across the region.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl">About CharmChase</h1>

      {HAS_PHOTO && (
        <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-xl bg-surface">
          <Image src="/images/about.jpg" alt="Artem, founder of CharmChase" fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
        </div>
      )}

      <p className="mt-6 font-serif text-xl text-ink">Hello, I&apos;m Artem.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        I run CharmChase from Evesham. I find every piece myself — at house clearances, local auctions and estate
        sales — then check it, photograph it and describe it honestly. When you message us with a question,
        you&apos;re talking to me.
      </p>

      <p className="mt-4 text-sm leading-relaxed text-muted">
        CharmChase is a curated antiques and vintage business based in
        Evesham, Worcestershire. We source furniture, jewellery, decor and
        art directly from house clearances and estate sales across
        Worcestershire, Oxfordshire and Warwickshire, and bring genuine,
        carefully chosen pieces to a wider audience online.
      </p>

      <h2 className="mt-8 text-sm font-medium tracking-widest text-ink">
        HOW WE SOURCE
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Every piece in the shop has been sourced in person — from estate
        clearances, local auctions and private sales across the West
        Midlands and the Cotswolds. We don't work from a catalogue or buy
        in bulk from importers; each item passes through our own hands
        before it's listed, which means we can speak honestly about its
        condition, age and history.
      </p>

      <h2 className="mt-8 text-sm font-medium tracking-widest text-ink">
        WHAT WE SELL
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Our range spans Georgian, Victorian, Edwardian and mid-century
        furniture; fine and vintage jewellery and watches; decorative
        objects, mirrors and tableware; and paintings, prints and
        sculpture. If a piece has real character and history behind it,
        it's the kind of thing you'll find here.
      </p>

      <h2 className="mt-8 text-sm font-medium tracking-widest text-ink">
        BUYING WITH CONFIDENCE
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Every listing includes clear photographs and an honest description
        of condition — antiques are pre-owned by nature, and we'd rather
        you know exactly what you're getting than be surprised. We ship
        across the UK and internationally, and every enquiry gets a real,
        personal reply.
      </p>

      <h2 className="mt-8 text-sm font-medium tracking-widest text-ink">
        GET IN TOUCH
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Got a question about a piece, want more photos, or you're looking
        for something specific that isn't listed yet? Message us on
        WhatsApp or through any product page — we're always happy to help,
        and we're often able to source pieces to order.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Selling antiques or clearing a home?{" "}
        <Link href="/sell" className="text-ink underline">
          We buy too
        </Link>
        .
      </p>
    </div>
  );
}
