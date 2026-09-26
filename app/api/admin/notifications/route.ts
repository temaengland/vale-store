import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readSyncLog } from "@/lib/ebaySync";

type FeedItem = {
  id: string;
  type: "order" | "inquiry" | "notify" | "ebay";
  created_at: string;
  headline: string;
  detail: string;
};

export async function GET() {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = supabaseAdmin();

    const [ordersRes, inquiriesRes, notifyRes] = await Promise.all([
      admin
        .from("orders")
        .select("id, created_at, customer_name, customer_email, total, currency")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("inquiries")
        .select("id, created_at, name, email, product_name")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("notify_requests")
        .select("id, created_at, email, category, subcategory")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // eBay two-way sync events (sold on eBay, listing ended, problems).
    const ebayLog = (await readSyncLog()).filter((e) => e.kind !== "linked");

    const feed: FeedItem[] = [
      ...ebayLog.map((e, i) => ({
        id: `ebay-${e.at}-${i}`,
        type: "ebay" as const,
        created_at: e.at,
        headline: e.kind === "error" ? "eBay — action needed" : e.kind === "sold_on_ebay" ? "Sold on eBay" : "eBay listing ended",
        detail: e.text,
      })),
      ...(ordersRes.data ?? []).map((o) => ({
        id: `order-${o.id}`,
        type: "order" as const,
        created_at: o.created_at,
        headline: `New order — £${(o.total / 100).toFixed(2)}`,
        detail: o.customer_name || o.customer_email || "Guest",
      })),
      ...(inquiriesRes.data ?? []).map((i) => ({
        id: `inquiry-${i.id}`,
        type: "inquiry" as const,
        created_at: i.created_at,
        headline: `New enquiry — ${i.product_name ?? "General"}`,
        detail: i.name || i.email || "Anonymous",
      })),
      ...(notifyRes.data ?? []).map((n) => ({
        id: `notify-${n.id}`,
        type: "notify" as const,
        created_at: n.created_at,
        headline: `Notify sign-up — ${[n.category, n.subcategory]
          .filter(Boolean)
          .join(" / ")}`,
        detail: n.email,
      })),
    ].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ feed: feed.slice(0, 40) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown server error.";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
