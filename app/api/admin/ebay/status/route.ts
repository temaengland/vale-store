import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { ebayConfigured, getConnection } from "@/lib/ebay";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configured = ebayConfigured();
  let connection = null;
  try {
    connection = await getConnection();
  } catch {
    /* app_settings missing */
  }
  return NextResponse.json({
    configured,
    connected: Boolean(connection),
    connectedAt: connection?.connectedAt,
    expiresAt: connection?.expiresAt,
  });
}
