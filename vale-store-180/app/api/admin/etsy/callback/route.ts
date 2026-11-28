import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminAuthed } from "@/lib/adminAuth";
import { finishConnect } from "@/lib/etsy";

// Etsy sends the shop owner back here after "Allow" (update 142).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const back = new URL("/admin", req.url);
  if (!isAdminAuthed()) {
    back.searchParams.set("etsy", "Log in to the admin first, then press Connect Etsy again.");
    return NextResponse.redirect(back);
  }
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const denied = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error");
  try {
    if (denied) throw new Error(denied);
    const shop = await finishConnect(code, state, cookies().get("etsy_pkce")?.value);
    back.searchParams.set("etsy", `Connected to Etsy shop ${shop} ✓`);
  } catch (e) {
    back.searchParams.set("etsy", `Etsy: ${e instanceof Error ? e.message : "could not connect"}`);
  }
  const res = NextResponse.redirect(back);
  res.cookies.delete("etsy_pkce");
  return res;
}
