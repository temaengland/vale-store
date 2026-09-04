import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email, category, subcategory, era, product_slug } =
      await req.json();

    if (!email || !category) {
      return NextResponse.json(
        { error: "Missing email or category." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin().from("notify_requests").insert({
      email,
      category,
      subcategory: subcategory || null,
      era: era || null,
      product_slug: product_slug || null,
    });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
