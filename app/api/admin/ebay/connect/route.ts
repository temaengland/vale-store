import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { authorizeUrl, ebayConfigured } from "@/lib/ebay";

// Admin → "Connect eBay": sends you to eBay's sign-in / consent screen.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.redirect("https://www.charmchase.co.uk/admin");
  if (!ebayConfigured())
    return NextResponse.json({ error: "Add EBAY_RUNAME in Vercel first." }, { status: 400 });

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
