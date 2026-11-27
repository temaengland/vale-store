"use client";

import { usePathname } from "next/navigation";
import BackLink from "@/components/BackLink";

// Update 132: a "← Back" link on every page except the homepage, product pages
// (they have their own) and the admin — so you can always step back, including
// in the installed app, which has no browser Back button. It goes back to the
// exact page you came from; if you arrived from outside, to the homepage.
export default function AutoBack() {
  const path = usePathname() || "/";
  if (path === "/" || path.startsWith("/product/") || path.startsWith("/admin")) return null;
  // Category pages already show the path (Home › …) on computers.
  const desktopHidden = path.startsWith("/category/");
  return (
    <div className={desktopHidden ? "lg:hidden" : ""}>
      <BackLink fallback="/" />
    </div>
  );
}
