import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  activeListingsPage,
  getItem,
  guessCategory,
  htmlToText,
  slugify,
  userAccessToken,
} from "@/lib/ebay";

// POST { page } — imports one page (5 listings) of your ACTIVE eBay listings
// as hidden drafts (is_draft = true) for review in Admin → Review drafts.
// The admin screen calls this page after page until done.
// Listings already on the site (same eBay ID or same name) are skipped.
// Photos are copied into our own storage so the site never depends on eBay.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_PAGE = 5;
const MAX_PHOTOS = 12;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

async function copyPhoto(url: string, itemId: string, index: number) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`photo ${index + 1}: ${res.status}`);
  const type = res.headers.get("content-type") || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const bytes = Buffer.from(await res.arrayBuffer());
  const name = `ebay-${itemId}-${index + 1}.${ext}`;
  const store = supabaseAdmin().storage.from("product-images");
  const { error } = await store.upload(name, bytes, { contentType: type, upsert: true });
  if (error) throw new Error(`photo ${index + 1}: ${error.message}`);
  return store.getPublicUrl(name).data.publicUrl;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page = 1 } = (await req.json().catch(() => ({}))) as { page?: number };
  const db = supabaseAdmin();

  try {
    const token = await userAccessToken();
    const { items, totalPages, totalItems } = await activeListingsPage(token, page, PER_PAGE);

    const ids = items.map((i) => i.itemId);
    const { data: existingById } = ids.length
      ? await db.from("products").select("ebay_item_id").in("ebay_item_id", ids)
      : { data: [] as { ebay_item_id: string }[] };
    const known = new Set((existingById || []).map((r) => r.ebay_item_id));

    const results: { itemId: string; title: string; result: string }[] = [];

    for (const it of items) {
      if (known.has(it.itemId)) {
        results.push({ itemId: it.itemId, title: it.title, result: "skipped — already imported" });
        continue;
      }
      const { data: sameName } = await db
        .from("products")
        .select("id")
        .ilike("name", it.title.replace(/[%_]/g, (m) => `\\${m}`))
        .limit(1);
      if (sameName && sameName.length) {
        results.push({ itemId: it.itemId, title: it.title, result: "skipped — already on the site" });
        continue;
      }

      try {
        const d = await getItem(token, it.itemId);

        // Category: saved mapping first, otherwise a best guess (editable in Review drafts).
        let category: string = guessCategory(d.categoryName, d.title);
        let subcategory: string | null = null;
        if (d.categoryId) {
          const { data: map } = await db
            .from("category_mapping")
            .select("site_category, site_subcategory")
            .eq("ebay_category_id", d.categoryId)
            .maybeSingle();
          if (map) {
            category = map.site_category;
            subcategory = map.site_subcategory;
          }
        }

        const photos = (
          await Promise.allSettled(d.pictures.slice(0, MAX_PHOTOS).map((u, i) => copyPhoto(u, d.itemId, i)))
        )
          .filter((p): p is PromiseFulfilledResult<string> => p.status === "fulfilled")
          .map((p) => p.value);

        let slug = slugify(d.title) || `ebay-${d.itemId}`;
        const { data: slugTaken } = await db.from("products").select("id").eq("slug", slug).limit(1);
        if (slugTaken && slugTaken.length) slug = `${slug}-${d.itemId.slice(-5)}`;

        const { error } = await db.from("products").insert({
          slug,
          name: d.title,
          price: d.pricePence,
          category,
          subcategory,
          description: htmlToText(d.descriptionHtml) || d.title,
          images: photos,
          image: photos[0] || null,
          icon: "generic",
          status: "available",
          ebay_item_id: d.itemId,
          is_draft: true,
        });
        if (error) throw new Error(error.message);
        results.push({
          itemId: d.itemId,
          title: d.title,
          result: `imported (${photos.length}/${Math.min(d.pictures.length, MAX_PHOTOS)} photos)`,
        });
      } catch (e) {
        results.push({ itemId: it.itemId, title: it.title, result: `error — ${errMsg(e)}` });
      }
    }

    return NextResponse.json({ page, totalPages, totalItems, results });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
