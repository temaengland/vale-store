import { NextRequest, NextResponse } from "next/server";
import { categoryFor } from "@/lib/oldUrls";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || "");
  const cat = slug === "all" || slug === "frontpage" ? null : categoryFor(slug);
  return NextResponse.redirect(new URL(cat ? `/category/${cat}` : "/new", req.url), 301);
}
