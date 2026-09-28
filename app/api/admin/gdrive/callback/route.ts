import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { connectWithCode } from "@/lib/gdrive";

// Google sends you back here after "Allow" (update 113).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const back = (status: string, msg?: string) => {
    const u = new URL("https://www.charmchase.co.uk/admin");
    u.searchParams.set("gdrive", status);
    if (msg) u.searchParams.set("msg", msg.slice(0, 200));
    const res = NextResponse.redirect(u);
    res.cookies.delete("gdrive_oauth_state");
    return res;
  };
  if (!isAdminAuthed()) return back("error", "Log in to admin first, then press Connect Google Drive again.");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code) return back("error", req.nextUrl.searchParams.get("error") || "Google did not allow access.");
  if (!state || state !== req.cookies.get("gdrive_oauth_state")?.value) return back("error", "Connection expired — try again.");
  try {
    await connectWithCode(code);
    return back("connected");
  } catch (e) {
    return back("error", e instanceof Error ? e.message : "Connection failed.");
  }
}
