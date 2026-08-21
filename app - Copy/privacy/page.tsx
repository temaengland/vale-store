export default function PrivacyPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted">Last updated: August 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
        <p>
          CharmChase ("we", "us", "our") is committed to protecting your
          privacy. This policy explains what personal data we collect, why we
          collect it, and how we use and protect it, in line with UK GDPR and
          the Data Protection Act 2018.
        </p>

        <section>
          <h2 className="font-medium text-ink">1. Who we are</h2>
          <p className="mt-2">
            CharmChase is a sole trader business based in Evesham,
            Worcestershire, selling furniture, jewelry, decor and art. For any
            questions about this policy or your data, you can reach us via
            WhatsApp or the enquiry form on this site.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">2. What data we collect</h2>
          <p className="mt-2">When you use this site, we may collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Name, email address, phone number and message — when you submit
              an enquiry about an item.
            </li>
            <li>
              Payment details — handled entirely by Stripe when you use "Buy
              now". We never see or store your card details ourselves.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium text-ink">3. How we use your data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To respond to your enquiries about items for sale.</li>
            <li>To arrange payment, delivery or collection of items you buy.</li>
            <li>
              To keep a record of enquiries so we can follow up and provide
              good service.
            </li>
          </ul>
          <p className="mt-2">
            We do not sell or share your personal data with third parties for
            marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">4. Where your data is stored</h2>
          <p className="mt-2">
            Enquiry data is stored securely using Supabase. Payments are
            processed by Stripe. Both providers are GDPR-compliant and use
            industry-standard security measures.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">5. Your rights</h2>
          <p className="mt-2">Under UK GDPR, you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Ask what personal data we hold about you.</li>
            <li>Ask us to correct inaccurate data.</li>
            <li>Ask us to delete your data.</li>
            <li>Withdraw consent to being contacted at any time.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us via WhatsApp or the
            enquiry form and we'll respond within one month.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">6. Cookies</h2>
          <p className="mt-2">
            This site does not currently use tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">7. Changes to this policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. Changes will be
            posted on this page.
          </p>
        </section>
      </div>
    </div>
  );
}
