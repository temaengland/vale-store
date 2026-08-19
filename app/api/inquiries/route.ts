import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, message, product_slug, product_name } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const { error } = await supabaseAdmin()
      .from("inquiries")
      .insert([{ name, email, phone, message, product_slug, product_name }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Enquiry couldn't be saved: ${message}` },
      { status: 500 }
    );
  }
}
