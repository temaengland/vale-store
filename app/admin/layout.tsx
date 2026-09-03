import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.json",
  icons: {
    icon: "/admin-icon-192.png",
    apple: "/admin-apple-touch-icon.png",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
