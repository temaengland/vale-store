import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthed())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  const { error } = await supabaseAdmin()
    .from("inquiries")
    .update({ status })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
