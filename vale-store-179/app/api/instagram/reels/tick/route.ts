import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { reelTick } from "@/lib/reels";

// Daily Reel scheduler step (update 109). Called every 15 min by Supabase
// pg_cron (job "instagram-daily-reel"); it only posts once a day, after the
// chosen UK hour. Auth: admin cookie or "Authorization: Bearer <CRON_SECRET>".

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
    return NextResponse.json(await reelTick());
  } catch (e) {
    return NextResponse.json({ status: "failed", error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
