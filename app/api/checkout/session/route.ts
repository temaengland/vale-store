import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Update 156: the amount of a finished checkout, for the purchase conversion
// (Google Ads / Meta). Only the total and paid status are returned.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const s = await stripe().checkout.sessions.retrieve(sid);
    return NextResponse.json({ paid: s.payment_status === "paid", value: (s.amount_total || 0) / 100 });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
