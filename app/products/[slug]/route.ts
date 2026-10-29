import { NextRequest, NextResponse } from "next/server";
import { bestProductUrl } from "@/lib/oldUrls";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const to = await bestProductUrl(decodeURIComponent(params.slug || ""));
  return NextResponse.redirect(new URL(to, req.url), 301);
}
