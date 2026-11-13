import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { connectWithCode } from "@/lib/ebay";

// eBay sends you back here after you approve access
// (set as "Your auth accepted URL" in the eBay RuName settings).
export const dynamic = "force-dynamic";

const ADMIN = "https://www.charmchase.co.uk/admin";

export async function GET(req: NextRequest) {
  const back = (status: string, msg?: string) => {
    const u = new URL(ADMIN);
    u.searchParams.set("ebay", status);
    if (msg) u.searchParams.set("msg", msg.slice(0, 200));
    const res = NextResponse.redirect(u);
    res.cookies.delete("ebay_oauth_state");
    return res;
  };

  if (!isAdminAuthed()) return back("error", "Log in to admin first, then press Connect eBay again.");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("ebay_oauth_state")?.value;
  if (!code) return back("error", "eBay did not approve the connection.");
  if (!state || state !== expected) return back("error", "Connection expired — press Connect eBay again.");

  try {
    await connectWithCode(code);
    return back("connected");
  } catch (e) {
    return back("error", e instanceof Error ? e.message : "Connection failed.");
  }
}
