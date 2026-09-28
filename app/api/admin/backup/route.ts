import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { gdriveStatus } from "@/lib/gdrive";
import { lastBackup, readBackupLog, runBackup } from "@/lib/backup";

// Admin → Notifications → Backups (update 113).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [drive, last, log] = await Promise.all([
    gdriveStatus().catch(() => ({ configured: false, connected: false })),
    lastBackup(),
    readBackupLog(),
  ]);
  return NextResponse.json({ drive, last, log: log.slice(0, 5) });
}

// "Back up now"
export async function POST() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runBackup()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Backup failed" }, { status: 500 });
  }
}
