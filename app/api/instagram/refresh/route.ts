import { NextResponse } from "next/server";
import { getToken, isConfigured } from "@/lib/instagram";

// Called once a day by Vercel Cron (vercel.json) so the Instagram token
// never expires, even if nothing is posted for weeks. Safe to call any time:
// it only renews when the saved token is more than a week old.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isConfigured()) return NextResponse.json({ ok: false, reason: "not configured" });
  const t = await getToken();
  return NextResponse.json({ ok: true, renewed: t.renewed, autoRenew: t.canStore });
}
