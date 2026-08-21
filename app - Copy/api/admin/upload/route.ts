import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Force the Node.js runtime explicitly — this route uses Buffer, which is
// not available in the Edge runtime, and running on Edge by mistake would
// crash with an unhandled error before ever reaching our own error handling.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminAuthed()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;

    const admin = supabaseAdmin();

    const { error: uploadError } = await admin.storage
      .from("product-images")
      .upload(fileName, bytes, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: `Supabase upload error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = admin.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    // Catch-all so a crash anywhere above always returns a readable message
    // instead of a bare, unexplained 500.
    const message = e instanceof Error ? e.message : "Unknown server error.";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
