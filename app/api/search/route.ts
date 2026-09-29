import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/data";
import { searchProducts } from "@/lib/shop";

// Live search for the header box (update 117). Public data only.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
  const found = searchProducts(await getAllProducts(), q);
  return NextResponse.json({
    total: found.length,
    results: found.slice(0, 6).map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      status: p.status || "available",
      image: p.images?.[0] || p.image || null,
    })),
  });
}
