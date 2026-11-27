import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { runEbaySync, endEbayListingsFor, logSyncEvents } from "@/lib/ebaySync";
import { runEtsySync, type EtsySyncResult } from "@/lib/etsy";
import { maybeWeeklyBackup } from "@/lib/backup";

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
    const sync = await runEbaySync().catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "sync failed" }));
    // Etsy (update 142): sold on Etsy → Sold here + eBay ended; sold here/eBay → Etsy removed.
    const etsy: EtsySyncResult = await runEtsySync().catch((e) => ({
      ok: false,
      error: e instanceof Error ? e.message : "etsy sync failed",
      soldOnEtsy: [],
      soldNames: [],
      ended: 0,
    }));
    if (etsy.soldOnEtsy.length) {
      await logSyncEvents(etsy.soldNames.map((n) => ({ kind: "sold_on_etsy" as const, text: `Sold on Etsy → marked Sold on site: “${n}”` })));
      await endEbayListingsFor(etsy.soldOnEtsy);
    }
    if (etsy.ended) {
      await logSyncEvents([{ kind: "ended_on_etsy" as const, text: `Sold elsewhere → ${etsy.ended} Etsy listing(s) removed` }]);
    }
    // Same 15-minute job also makes the weekly Google Drive backup (update 113).
    const backup = await maybeWeeklyBackup().catch((e) => ({ status: "failed", error: String(e) }));
    return NextResponse.json({ ...sync, etsy, backup: backup.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
