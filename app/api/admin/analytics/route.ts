import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    if (!isAdminAuthed())
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = supabaseAdmin();

    const [productsRes, categoriesRes] = await Promise.all([
      admin
        .from("products")
        .select("id, slug, name, category, image, images, view_count")
        .order("view_count", { ascending: false }),
      admin.from("category_views").select("category, count"),
    ]);

    if (productsRes.error)
      return NextResponse.json(
        { error: productsRes.error.message },
        { status: 500 }
      );
    if (categoriesRes.error)
      return NextResponse.json(
        { error: categoriesRes.error.message },
        { status: 500 }
      );

    return NextResponse.json({
      products: productsRes.data,
      categories: categoriesRes.data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown server error.";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
