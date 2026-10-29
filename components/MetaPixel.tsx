"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Update 147: Meta (Facebook/Instagram) Pixel. Off until NEXT_PUBLIC_META_PIXEL_ID
// is set in Vercel. Sends PageView on every page; product pages add ViewContent,
// the "paid" page adds Purchase. Not loaded on /admin.
const ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();

type Fbq = (...a: unknown[]) => void;

export function trackPixel(event: string, data?: Record<string, unknown>) {
  const w = window as unknown as { fbq?: Fbq };
  if (w.fbq) w.fbq("track", event, data);
}

export default function MetaPixel() {
  const path = usePathname() || "";
  const admin = path.startsWith("/admin");
  const first = useRef(true);
  useEffect(() => {
    if (!ID || admin) return;
    if (first.current) {
      first.current = false; // the loader script already sent the first PageView
      return;
    }
    trackPixel("PageView");
  }, [path, admin]);
  if (!ID || admin) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ID}');fbq('track','PageView');`}
    </Script>
  );
}
