import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { runEbaySync } from "@/lib/ebaySync";

// Two-way sold sync with eBay (update 107).
// Called every 15 min by Supabase (pg_cron), once a day by Vercel Cron,
// and by the "Sync with eBay" button in Admin → Review drafts.
// Auth: admin cookie, or header "Authorization: Bearer <CRON_SECRET>".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function allowed(req: NextRequest) {
  if (isAdminAuthed()) return true;
  const secret = (process.env.CRON_SECRET || "").trim();
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runEbaySync());
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
