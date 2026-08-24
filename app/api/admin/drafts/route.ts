import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown server error.";
}

export async function GET() {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin()
      .from("products")
      .select("*")
      .eq("is_draft", true)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ drafts: data });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${errMsg(e)}` },
      { status: 500 }
    );
  }
}

// Quick-edit from the review queue: update category/subcategory, and/or
// publish (flip is_draft to false) — without opening the full item editor.
export async function PATCH(req: NextRequest) {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, category, subcategory, publish } = await req.json();
    if (!id)
      return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (category !== undefined) update.category = category;
    if (subcategory !== undefined) update.subcategory = subcategory;
    if (publish) update.is_draft = false;

    const { data, error } = await supabaseAdmin()
      .from("products")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${errMsg(e)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const { error } = await supabaseAdmin()
      .from("products")
      .delete()
      .eq("id", id)
      .eq("is_draft", true); // safety: only ever deletes a draft, never a live product

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${errMsg(e)}` },
      { status: 500 }
    );
  }
}
