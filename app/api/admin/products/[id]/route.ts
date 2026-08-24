import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyIndexNow } from "@/lib/indexnow";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown server error.";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { data, error } = await supabaseAdmin()
      .from("products")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (data && !data.is_draft) {
      notifyIndexNow([`https://www.charmchase.co.uk/product/${data.slug}`]);
    }

    return NextResponse.json({ product: data });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${errMsg(e)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabaseAdmin()
      .from("products")
      .delete()
      .eq("id", params.id);

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
