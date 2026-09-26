import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyIndexNow } from "@/lib/indexnow";
import { endEbayListingsFor } from "@/lib/ebaySync";

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
    const { data: before } = await supabaseAdmin()
      .from("products")
      .select("status")
      .eq("id", params.id)
      .maybeSingle();
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

    // Marked Sold here (e.g. sold in the shop) → end the eBay listing too.
    let ebay: { ok: boolean; error?: string }[] = [];
    if (data?.status === "sold" && before?.status !== "sold" && data.ebay_item_id) {
      ebay = await endEbayListingsFor([data.id]);
    }

    return NextResponse.json({ product: data, ebay });
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
