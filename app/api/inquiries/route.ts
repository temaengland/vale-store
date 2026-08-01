import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, message, product_slug, product_name } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin()
      .from("inquiries")
      .insert([{ name, email, phone, message, product_slug, product_name }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Supabase not configured yet — fail gracefully rather than crash.
    return NextResponse.json(
      { error: "Enquiries aren't set up yet." },
      { status: 500 }
    );
  }
}
