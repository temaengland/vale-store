"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Update 121: counts pages visited on our site in this tab, so "Back" knows
// whether it can go back in history (to the same list and place) or should
// go to a sensible page instead (e.g. arriving from Google or from Stripe).
export const NAV_KEY = "cc_nav_depth";

export default function NavTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    try {
      if (first.current) {
        first.current = false;
        let fromUs = false;
        try {
          fromUs = !!document.referrer && new URL(document.referrer).hostname === window.location.hostname;
        } catch {
          fromUs = false;
        }
        const prev = Number(sessionStorage.getItem(NAV_KEY) || "0");
        sessionStorage.setItem(NAV_KEY, String(fromUs && prev > 0 ? prev + 1 : 1));
        return;
      }
      const d = Number(sessionStorage.getItem(NAV_KEY) || "1");
      sessionStorage.setItem(NAV_KEY, String(d + 1));
    } catch {
      /* storage blocked — Back falls back to the category page */
    }
  }, [pathname, params]);

  return null;
}
