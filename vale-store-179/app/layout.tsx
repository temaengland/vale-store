import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import AutoBack from "@/components/AutoBack";
import NavTracker from "@/components/NavTracker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import { Analytics } from "@vercel/analytics/next";
import MetaPixel from "@/components/MetaPixel";
import GoogleAds from "@/components/GoogleAds";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Update 157: fonts are stored in the site itself (app/fonts) — the build no
// longer downloads them from Google Fonts (a failed download broke a deploy).
const serif = localFont({
  src: [
    { path: "./fonts/playfair-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/playfair-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
});

const sans = localFont({
  src: "./fonts/inter-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.charmchase.co.uk"),
  title: {
    default: "CharmChase — Curated Antiques & Vintage",
    template: "%s — CharmChase",
  },
  description:
    "Curated antique and vintage furniture, jewellery, decor and art, sourced from estate sales across Worcestershire, Oxfordshire and Warwickshire.",
  keywords: [
    "antiques",
    "vintage furniture",
    "antique jewellery",
    "estate sale finds",
    "Worcestershire antiques",
    "Evesham antiques",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    siteName: "CharmChase",
    type: "website",
    url: "https://www.charmchase.co.uk",
    images: [{ url: "/images/hero.jpg" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://hbmfkrrjxlpamzgozzmh.supabase.co" />
      </head>
      <body className={`${serif.variable} ${sans.variable} font-sans`}>
        <LanguageProvider>
          <CartProvider>
            <Suspense>
              <NavTracker />
            </Suspense>
            <Header />
            <main className="mx-auto max-w-6xl px-6 py-10">
              <AutoBack />
              {children}
            </main>
            <Footer />
            <Analytics />
            <MetaPixel />
            <GoogleAds />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
