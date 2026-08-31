import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import { Analytics } from "@vercel/analytics/next";

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "700"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
      <body className={`${serif.variable} ${sans.variable} font-sans`}>
        <LanguageProvider>
          <CartProvider>
            <Header />
            <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
            <Footer />
            <Analytics />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
