import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "Our returns and refunds policy for antique and vintage purchases, including how to return an item safely, refunds, and international orders.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl">Returns &amp; Refunds</h1>
      <p className="mt-2 text-xs text-muted">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="font-medium text-ink">Your right to cancel</h2>
          <p className="mt-2">
            Under the Consumer Contracts (Information, Cancellation and
            Additional Charges) Regulations 2013, you have the right to
            cancel your order within <strong className="text-ink">14 calendar days</strong> of
            receiving your item, without giving a reason.
          </p>
          <p className="mt-2">
            To cancel, contact us via WhatsApp or email within this period.
            You then have a further 14 days to return the item to us once
            you've told us you want to cancel.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Condition of items</h2>
          <p className="mt-2">
            Our pieces are antique, vintage or second-hand, and are described
            and photographed as accurately as possible, including any
            age-related wear, marks or imperfections. Please read the full
            description and look closely at the photos before buying. Wear
            that is disclosed in the listing is normal for a genuine antique
            and is not treated as a fault — this does not affect your right
            to cancel within 14 days.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Looking after the item</h2>
          <p className="mt-2">
            You may inspect the item as you would in a shop, but please
            handle it with care and do not use, alter, clean, polish, repair
            or resize it before deciding to keep it. Many antiques are
            fragile and cannot easily be restored once damaged.
          </p>
          <p className="mt-2">
            Items must be returned in the <strong className="text-ink">same condition</strong> in
            which we sent them, complete with any accessories, boxes or
            paperwork. If an item comes back damaged, used, or with its value
            otherwise reduced by more handling than was needed to inspect it,
            we will deduct the loss in value from your refund — up to the
            full price of the item.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Sending an item back</h2>
          <p className="mt-2">
            Unless the item was faulty or not as described, the cost of
            returning it is yours. The item remains your responsibility until
            it reaches us, so please:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>pack it at least as securely as we packed it;</li>
            <li>
              send it with a tracked service, insured for its full value;
            </li>
            <li>keep your proof of postage.</li>
          </ul>
          <p className="mt-2">
            If an item is lost or damaged on its way back because it was
            poorly packed or sent uninsured, we may reduce your refund
            accordingly. We photograph every item before dispatch and when a
            return is unpacked.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Refunds</h2>
          <p className="mt-2">
            If you cancel, we refund the price of the item and the{" "}
            <strong className="text-ink">standard delivery cost</strong> you paid. If you
            chose a more expensive delivery option than our cheapest standard
            one, we only refund the cost of the standard option.
          </p>
          <p className="mt-2">
            We'll process your refund within 14 days of receiving the item
            back and checking its condition (or of you providing proof of
            postage, whichever is sooner), to the original payment method.
            Any deduction for loss in value may be made after we receive and
            inspect the item.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Damaged, faulty or not as described</h2>
          <p className="mt-2">
            If an item arrives damaged or significantly different from its
            description, contact us as soon as possible with photos. Your
            statutory rights under the Consumer Rights Act 2015 are not
            affected — we'll arrange a repair, replacement or full refund,
            including delivery costs, and we'll cover reasonable return
            postage.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">International orders</h2>
          <p className="mt-2">
            For orders shipped outside the UK, your order may be subject to
            import duties, taxes and customs processing fees charged by your
            country's customs authority. These charges are not included in
            the item price or shipping cost and are the buyer's
            responsibility. Any customs duties and taxes already paid are
            not refunded if you return an item.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">How to start a return</h2>
          <p className="mt-2">
            Message us via WhatsApp or the enquiry form with your order
            details and the reason for the return, and we'll guide you
            through the next steps before you send anything.
          </p>
        </section>
      </div>
    </div>
  );
}
