import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";

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
  title: "CharmChase — Furniture, jewelry and decor",
  description:
    "Furniture, jewelry and decor sourced from estate sales across Worcestershire, Oxfordshire and Warwickshire.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CharmChase",
  },
};

export const viewport = {
  themeColor: "#332E27",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans`}>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <Footer />
        <InstallPrompt />
      </body>
    </html>
  );
}
