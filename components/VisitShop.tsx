import { GOOGLE_REVIEWS, SHOP, type Trust } from "@/lib/trust";

// Update 147 (homepage): the real shop on Evesham High Street + real reviews.
export default function VisitShop({ trust }: { trust: Trust }) {
  const { photos } = SHOP;
  return (
    <section className="mt-16 grid items-center gap-6 rounded-xl border border-border p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
      <div className="grid h-[260px] grid-cols-[2fr_1fr] grid-rows-2 gap-2 sm:h-[320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos.front} alt="CharmChase antique shop front, High Street, Evesham" className="row-span-2 h-full w-full rounded-lg object-cover object-top" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos.inside} alt="Inside the CharmChase shop" className="h-full w-full rounded-lg object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos.jewellery} alt="Paintings, glass and clocks inside the CharmChase shop" className="h-full w-full rounded-lg object-cover" />
      </div>
      <div>
        <p className="text-xs tracking-widest text-muted uppercase">A real shop on Evesham High Street</p>
        <h2 className="mt-2 font-serif text-2xl">Visit us in Evesham</h2>
        <p className="mt-2 text-sm text-muted">
          {SHOP.address} — come and see any piece in person before you buy.
        </p>
        {(trust.google.show || trust.ebay) && (
          <p className="mt-3 text-sm">
            <span className="tracking-[1px] text-[#C9962E]">★★★★★</span>{" "}
            {trust.google.show && (
              <>
                <b>{trust.google.rating.toFixed(1)}</b> on Google
              </>
            )}
            {trust.google.show && trust.ebay && " · "}
            {trust.ebay && (
              <a href={trust.ebay.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                <b>{trust.ebay.positive % 1 ? trust.ebay.positive.toFixed(1) : trust.ebay.positive}%</b> positive feedback on eBay
              </a>
            )}
          </p>
        )}
        {trust.google.show &&
          GOOGLE_REVIEWS.quotes.slice(0, 2).map((q) => (
            <blockquote key={q.name} className="mt-3 border-l-2 border-[#AD8A4E] pl-3 text-sm italic text-ink">
              “{q.text}”
              <span className="mt-0.5 block text-xs not-italic text-muted">{q.name}, Google review</span>
            </blockquote>
          ))}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {trust.google.show && (
            <a href={trust.google.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Read all reviews
            </a>
          )}
          <a href={trust.google.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Get directions
          </a>
        </p>
      </div>
    </section>
  );
}
