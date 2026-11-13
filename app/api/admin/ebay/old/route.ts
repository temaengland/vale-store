import { NextResponse } from "next/server";

// Update 166: old-eBay move removed (see lib/ebayMove.ts). Safe to delete.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Removed" }, { status: 410 });
}
