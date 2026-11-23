import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Update 171: "We buy before your house clearance" lead form (/before-clearance).
// Saves the lead in Admin → Enquiries (product_slug "before-clearance") and stores
// up to 6 photos in Supabase storage. The browser then emails it to the shop.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PHOTOS = 6;
const MAX_BYTES = 3 * 1024 * 1024; // per photo, after the browser has shrunk it
const clean = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").trim().slice(0, max);

const lastByIp = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
    const now = Date.now();
    if ((lastByIp.get(ip) || 0) > now - 20_000) {
      return NextResponse.json({ error: "Please wait a moment before sending again." }, { status: 429 });
    }

    const f = await req.formData();
    if (clean(f.get("website"))) return NextResponse.json({ ok: true, photos: [] }); // honeypot

    const name = clean(f.get("name"), 120);
    const phone = clean(f.get("phone"), 40);
    const email = clean(f.get("email"), 160);
    const location = clean(f.get("location"), 120);
    const situation = clean(f.get("situation"), 80);
    const when = clean(f.get("when"), 80);
    const contact = clean(f.get("contact"), 40);
    const items = clean(f.get("items"), 3000);

    if (!name || !phone || !location || !items) {
      return NextResponse.json({ error: "Please fill in your name, phone, town or postcode and what you have." }, { status: 400 });
    }
    lastByIp.set(ip, now);

    const db = supabaseAdmin();
    const photos: string[] = [];
    const files = f.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, MAX_PHOTOS);
    for (const [i, file] of files.entries()) {
      if (file.size > MAX_BYTES || !file.type.startsWith("image/")) continue;
      const key = `leads/${now}-${Math.random().toString(36).slice(2, 10)}-${i + 1}.jpg`;
      const { error } = await db.storage
        .from("product-images")
        .upload(key, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (!error) photos.push(db.storage.from("product-images").getPublicUrl(key).data.publicUrl);
    }

    const lines = [
      "HOUSE CLEARANCE LEAD — we buy before clearance",
      `Location: ${location}`,
      situation ? `Situation: ${situation}` : "",
      when ? `Needs clearing: ${when}` : "",
      contact ? `Best way to contact: ${contact}` : "",
    ].filter(Boolean);
    const message = [lines.join("\n"), items, photos.length ? `Photos:\n${photos.join("\n")}` : ""]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await db.from("inquiries").insert([
      {
        name,
        email: email || "(no email given)",
        phone,
        message,
        product_slug: "before-clearance",
        product_name: "House clearance lead",
      },
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, photos });
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't send: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 500 }
    );
  }
}
