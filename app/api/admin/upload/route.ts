import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  if (!isAdminAuthed())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;

  const { error: uploadError } = await supabaseAdmin()
    .storage.from("product-images")
    .upload(fileName, bytes, { contentType: file.type });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabaseAdmin()
    .storage.from("product-images")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: data.publicUrl });
}
