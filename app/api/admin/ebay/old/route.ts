import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { moveListing, oldAccountStatus, oldListings } from "@/lib/ebayMove";

// Update 161: old eBay account → main account.
// GET            — connection status
// GET ?list=1    — active old listings, each marked if already on the site / new eBay
// POST {itemId}  — move one listing (create on the new account, end on the old one)
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
  const { itemId } = (await req.json().catch(() => ({}))) as { itemId?: string };
  if (!itemId || !/^\d{6,20}$/.test(itemId)) return NextResponse.json({ error: "Bad item number" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await moveListing(itemId)) });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}
