import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { draftRows, oldAccountStatus, oldListings } from "@/lib/ebayMove";

// Update 167: old eBay account → drafts file for the new account.
// GET             — connection status
// GET ?list=1     — live old listings, each marked if already on the site / new eBay
// POST {itemIds}  — details of up to 15 listings for the drafts file
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const msg = (e: unknown) => (e instanceof Error ? e.message : "Failed");

export async function GET(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = await oldAccountStatus();
    if (!req.nextUrl.searchParams.get("list") || !status.connected) return NextResponse.json(status);
    return NextResponse.json({ ...status, listings: await oldListings() });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemIds } = (await req.json().catch(() => ({}))) as { itemIds?: string[] };
  const ids = (itemIds || []).filter((x) => /^\d{6,20}$/.test(x)).slice(0, 15);
  if (!ids.length) return NextResponse.json({ error: "No items" }, { status: 400 });
  try {
    return NextResponse.json(await draftRows(ids));
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}
