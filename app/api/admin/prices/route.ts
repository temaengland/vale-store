import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { saveEbayPrices, sitePriceFromEbay } from "@/lib/pricing";

// Update 147: site prices X% below eBay/Etsy, with a saved copy of the old
// prices so it can be undone.
// POST { action: "preview" | "apply", percent }  ·  { action: "restore", key }
// GET → saved backups.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PREFIX = "price_backup:";

function cut(pence: number, percent: number) {
  if (percent === 10) return sitePriceFromEbay(pence);
  const pounds = (pence / 100) * (1 - percent / 100);
  const r = pounds < 100 ? Math.round(pounds) : Math.round(pounds / 5) * 5;
  return Math.max(1, r) * 100;
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin().from("app_settings").select("key, updated_at").like("key", `${PREFIX}%`);
  return NextResponse.json({ backups: data || [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; percent?: number; key?: string };
  const db = supabaseAdmin();
  try {
    if (body.action === "restore") {
      const { data } = await db.from("app_settings").select("value").eq("key", String(body.key || "")).maybeSingle();
      if (!data) throw new Error("Backup not found.");
      const old = JSON.parse(data.value) as Record<string, number>;
      let n = 0;
      for (const [id, price] of Object.entries(old)) {
        const { error } = await db.from("products").update({ price }).eq("id", id);
        if (!error) n++;
      }
      return NextResponse.json({ ok: true, restored: n });
    }
    const percent = Math.max(1, Math.min(30, Number(body.percent) || 10));
    const { data, error } = await db
      .from("products")
      .select("id, name, price, status, is_draft")
      .neq("status", "sold")
      .or("is_draft.is.null,is_draft.eq.false");
    if (error) throw new Error(error.message);
    const rows = (data || []).map((p) => ({ id: p.id as string, name: p.name as string, from: p.price as number, to: cut(p.price as number, percent) }));
    if (body.action !== "apply") return NextResponse.json({ percent, rows });
    const key = `${PREFIX}${new Date().toISOString().slice(0, 16)}`;
    await db
      .from("app_settings")
      .upsert({ key, value: JSON.stringify(Object.fromEntries(rows.map((r) => [r.id, r.from]))), updated_at: new Date().toISOString() });
    // The current prices are the eBay prices → remember them for Etsy (update 148).
    await saveEbayPrices(Object.fromEntries(rows.map((r) => [r.id, r.from])));
    let n = 0;
    for (const r of rows) {
      if (r.to === r.from) continue;
      const { error: e } = await db.from("products").update({ price: r.to }).eq("id", r.id);
      if (!e) n++;
    }
    return NextResponse.json({ ok: true, changed: n, backup: key });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
