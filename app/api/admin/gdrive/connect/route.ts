import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { authorizeUrl, gdriveConfigured } from "@/lib/gdrive";

// Admin → Notifications → Backups → "Connect Google Drive" (update 113).
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.redirect("https://www.charmchase.co.uk/admin");
  if (!gdriveConfigured())
    return NextResponse.json({ error: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel first." }, { status: 400 });
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("gdrive_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
