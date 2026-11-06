"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { trackPixel } from "@/components/MetaPixel";

// Update 156: Google Ads tag + purchase conversion. Off until
// NEXT_PUBLIC_GOOGLE_ADS_ID (AW-…) is set in Vercel; the purchase conversion
// also needs NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL. Not loaded on /admin.
const ID = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "").trim();
const LABEL = (process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "").trim();
// Update 157: Google Customer Reviews (free store rating). Off until
// NEXT_PUBLIC_GOOGLE_MERCHANT_ID is set (after joining the programme in Merchant Center).
const MERCHANT = (process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID || "").trim();

function addWorkingDays(days: number) {
  const d = new Date();
  let n = 0;
  while (n < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d.toISOString().slice(0, 10);
}

function offerReviewSurvey(orderId: string, email: string) {
  if (!MERCHANT || !email) return;
  const w = window as unknown as {
    renderOptIn?: () => void;
    gapi?: { load: (m: string, cb: () => void) => void; surveyoptin: { render: (o: Record<string, unknown>) => void } };
  };
  w.renderOptIn = () => {
    w.gapi?.load("surveyoptin", () => {
      w.gapi?.surveyoptin.render({
        merchant_id: Number(MERCHANT),
        order_id: orderId,
        email,
        delivery_country: "GB",
        estimated_delivery_date: addWorkingDays(4),
      });
    });
  };
  const s = document.createElement("script");
  s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
  s.async = true;
  document.body.appendChild(s);
}

type Gtag = (...a: unknown[]) => void;

/**
 * Called once on the "payment received" page. Reads the real amount from
 * Stripe (by the checkout session id) and reports the sale to Google Ads and
 * Meta, once per order (refreshing the page doesn't count it again).
 */
export async function reportPurchase(sid: string | null) {
  let value: number | undefined;
  let orderId: string | undefined;
  if (sid) {
    const key = `cc_purchase_${sid}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* storage blocked — still report */
    }
    try {
      const r = await fetch(`/api/checkout/session?sid=${encodeURIComponent(sid)}`);
      if (r.ok) {
        const j = (await r.json()) as { paid?: boolean; value?: number; email?: string | null };
        if (j.paid === false) return;
        value = j.value;
        orderId = sid;
        if (j.email) offerReviewSurvey(sid, j.email);
      }
    } catch {
      /* report without value */
    }
  }
  trackPixel("Purchase", { currency: "GBP", ...(value != null ? { value } : {}) });
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (g && ID && LABEL) {
    g("event", "conversion", {
      send_to: `${ID}/${LABEL}`,
      currency: "GBP",
      ...(value != null ? { value } : {}),
      ...(orderId ? { transaction_id: orderId } : {}),
    });
  }
}

export default function GoogleAds() {
  const path = usePathname() || "";
  if (!ID || path.startsWith("/admin")) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ID}`} strategy="afterInteractive" />
      <Script id="google-ads" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ID}');`}
      </Script>
    </>
  );
}
