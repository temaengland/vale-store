import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { authorizeUrl, ebayConfigured } from "@/lib/ebay";

// Admin → "Connect eBay": sends you to eBay's sign-in / consent screen.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Update 161: ?account=old connects the OLD eBay account (to move its listings).
  const account = req.nextUrl.searchParams.get("account") === "old" ? "old" : "main";
  if (!isAdminAuthed()) return NextResponse.redirect("https://www.charmchase.co.uk/admin");
  if (!ebayConfigured())
    return NextResponse.json({ error: "Add EBAY_RUNAME in Vercel first." }, { status: 400 });

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state, account));
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  res.cookies.set("ebay_oauth_account", account, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
