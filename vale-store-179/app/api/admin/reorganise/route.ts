import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { guessPlacement } from "@/lib/ebay";

// Update 121: one-off move of existing items into the six categories —
// watches out of Jewellery, silverware into Silver, the old Decor split into
// Ceramics & Glass / Art & Decor. GET = preview only, POST = apply.
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; category: string; subcategory: string | null };
type Move = { id: string; name: string; from: string; to: string; category: string; subcategory: string | null };

function label(c: string, s: string | null) {
  return s ? `${c} › ${s}` : c;
}

function planFor(p: Row): { category: string; subcategory: string | null } | null {
  const g = guessPlacement("", p.name);
  // Update 122: clocks (e.g. carriage clocks filed under Furniture/Decor) → Watches & Clocks.
  if (p.category !== "watches" && (p.subcategory === "Clocks" || (g.category === "watches" && g.subcategory === "Clocks"))) {
    return { category: "watches", subcategory: "Clocks" };
  }
  if (p.category === "jewelry") {
    if (p.subcategory === "Watches" || g.category === "watches") {
      return { category: "watches", subcategory: g.category === "watches" ? g.subcategory : "Wristwatches" };
    }
    if (p.subcategory === "Silver" || p.subcategory === "Silver Plate" || g.category === "silver") {
      return { category: "silver", subcategory: p.subcategory === "Silver Plate" ? "Silver Plate" : g.category === "silver" ? g.subcategory : null };
    }
    return null;
  }
  if (p.category === "decor") {
    if (["ceramics", "art", "silver", "furniture", "watches"].includes(g.category)) return { category: g.category, subcategory: g.subcategory };
    return { category: "art", subcategory: null };
  }
  if (p.category === "art" && p.subcategory === "Ceramics") {
    return { category: "ceramics", subcategory: g.category === "ceramics" ? g.subcategory : "Porcelain" };
  }
  return null;
}

async function plan(): Promise<Move[]> {
  const { data, error } = await supabaseAdmin().from("products").select("id, name, category, subcategory");
  if (error) throw new Error(error.message);
  const moves: Move[] = [];
  for (const p of (data || []) as Row[]) {
    const to = planFor(p);
    if (!to || (to.category === p.category && to.subcategory === p.subcategory)) continue;
    moves.push({
      id: p.id,
      name: p.name,
      from: label(p.category, p.subcategory),
      to: label(to.category, to.subcategory),
      category: to.category,
      subcategory: to.subcategory,
    });
  }
  return moves;
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ moves: await plan() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const moves = await plan();
    let done = 0;
    for (const m of moves) {
      const { error } = await supabaseAdmin()
        .from("products")
        .update({ category: m.category, subcategory: m.subcategory })
        .eq("id", m.id);
      if (!error) done++;
    }
    return NextResponse.json({ done, total: moves.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
