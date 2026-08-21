import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/data";

export async function POST(req: NextRequest) {
  try {
    const { slugs } = await req.json();
    if (!Array.isArray(slugs)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const all = await getAllProducts();
    const products = all.filter((p) => slugs.includes(p.slug));
    return NextResponse.json({ products });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
