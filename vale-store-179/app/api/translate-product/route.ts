import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// MyMemory's free translation API has a per-request length limit — long
// pasted descriptions get truncated before translating so the request
// doesn't just fail outright.
const MAX_TRANSLATE_LENGTH = 480;

async function translateText(text: string, targetLang: string): Promise<string> {
  const safeText =
    text.length > MAX_TRANSLATE_LENGTH
      ? text.slice(0, MAX_TRANSLATE_LENGTH)
      : text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    safeText
  )}&langpair=en|${targetLang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation service returned ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated || typeof translated !== "string") {
    throw new Error("Translation service returned no text");
  }
  return translated;
}

export async function POST(req: NextRequest) {
  try {
    const { slug, lang } = await req.json();
    if (!slug || !lang) {
      return NextResponse.json({ error: "Missing slug or lang." }, { status: 400 });
    }
    if (lang === "en") {
      // Nothing to translate — caller should just use the original text.
      return NextResponse.json({ cached: true, skip: true });
    }

    const product = await getProduct(slug);
    if (!product) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    // No Supabase configured yet — translate on the fly without caching
    // rather than failing outright.
    if (!isSupabaseConfigured || !supabase) {
      const [name, description] = await Promise.all([
        translateText(product.name, lang),
        translateText(product.description, lang),
      ]);
      return NextResponse.json({ name, description, cached: false });
    }

    // Need the product's real id (not just slug) to key the cache table —
    // fetch it via the admin client since it's not in the public columns.
    const admin = supabaseAdmin();
    const { data: idRow } = await admin
      .from("products")
      .select("id")
      .eq("slug", slug)
      .single();
    if (!idRow) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const { data: cached } = await supabase
      .from("product_translations")
      .select("name, description")
      .eq("product_id", idRow.id)
      .eq("lang", lang)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const [name, description] = await Promise.all([
      translateText(product.name, lang),
      translateText(product.description, lang),
    ]);

    // Cache for next time — best-effort; if this fails we still return
    // the translation, just without saving it.
    await admin
      .from("product_translations")
      .upsert({ product_id: idRow.id, lang, name, description });

    return NextResponse.json({ name, description, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json(
      { error: `Translation failed: ${message}` },
      { status: 500 }
    );
  }
}
