import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { getCategoryPhotoMap, setCategoryPhoto } from "@/lib/categoryPhotos";

// Update 118: which item's photo is shown on each homepage category tile.
export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ photos: await getCategoryPhotoMap() });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { category, productId } = await req.json();
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Missing category." }, { status: 400 });
    }
    const photos = await setCategoryPhoto(category, productId ? String(productId) : null);
    return NextResponse.json({ photos });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
