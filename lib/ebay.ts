import "server-only";
import { XMLParser } from "fast-xml-parser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// eBay connection for importing our own eBay listings as drafts.
// Env (Vercel): EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_RUNAME.
// The long-lived refresh token (18 months) is stored in Supabase app_settings.

const API = process.env.EBAY_API_BASE || "https://api.ebay.com";
const AUTH = process.env.EBAY_AUTH_BASE || "https://auth.ebay.com";
const REFRESH_KEY = "ebay_refresh_token";
// Scopes asked for on "Connect eBay". Full seller access so the site can also
// END a listing when the item sells on the site (read-only can't do that).
export const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
];
// What connections made before update 107 were granted (read-only).
const LEGACY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
];
const WRITE_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory";

function env(name: string) {
  return (process.env[name] || "").trim();
}

export function ebayConfigured() {
  return Boolean(env("EBAY_APP_ID") && env("EBAY_CERT_ID") && env("EBAY_RUNAME"));
}

function basicAuth() {
  return "Basic " + Buffer.from(`${env("EBAY_APP_ID")}:${env("EBAY_CERT_ID")}`).toString("base64");
}

export function authorizeUrl(state: string) {
  const q = new URLSearchParams({
    client_id: env("EBAY_APP_ID"),
    response_type: "code",
    redirect_uri: env("EBAY_RUNAME"),
    scope: EBAY_SCOPES.join(" "),
    state,
  });
  return `${AUTH}/oauth2/authorize?${q}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${API}/identity/v1/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`eBay token error: ${data.error_description || data.error || res.status}`);
  }
  return data as { access_token: string; refresh_token?: string; refresh_token_expires_in?: number };
}

/** Exchanges the code from the eBay consent screen and saves the refresh token. */
export async function connectWithCode(code: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: env("EBAY_RUNAME"),
  });
  if (!t.refresh_token) throw new Error("eBay did not return a refresh token.");
  const expiresAt = new Date(Date.now() + (t.refresh_token_expires_in || 0) * 1000).toISOString();
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({
      key: REFRESH_KEY,
      value: JSON.stringify({ token: t.refresh_token, expiresAt, scopes: EBAY_SCOPES }),
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Could not save eBay connection: ${error.message}`);
  return { expiresAt };
}

export async function getConnection() {
  const { data } = await supabaseAdmin()
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", REFRESH_KEY)
    .maybeSingle();
  if (!data) return null;
  try {
    const v = JSON.parse(data.value) as { token: string; expiresAt?: string; scopes?: string[] };
    const scopes = v.scopes && v.scopes.length ? v.scopes : LEGACY_SCOPES;
    return {
      token: v.token,
      expiresAt: v.expiresAt,
      connectedAt: data.updated_at as string,
      scopes,
      canEndListings: scopes.includes(WRITE_SCOPE),
    };
  } catch {
    return null;
  }
}

export async function userAccessToken() {
  const c = await getConnection();
  if (!c) throw new Error("eBay is not connected yet — press “Connect eBay” first.");
  const t = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: c.token,
    scope: c.scopes.join(" "), // only what this connection was granted
  });
  return t.access_token;
}

// ---------- Trading API ----------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["Item", "PictureURL", "NameValueList", "Errors", "OrderTransaction", "Transaction", "Order"].includes(name),
});

export async function trading(callName: string, innerXml: string, token: string) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
${innerXml}
</${callName}Request>`;
  const res = await fetch(`${API}/ws/api.dll`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "text/xml",
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-SITEID": "3", // eBay UK
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1193",
      "X-EBAY-API-IAF-TOKEN": token,
    },
    body,
  });
  const text = await res.text();
  const json = parser.parse(text);
  const r = json[`${callName}Response`];
  if (!r) throw new Error(`eBay ${callName}: unexpected reply (${res.status})`);
  if (r.Ack === "Failure") {
    const e = (r.Errors || [])[0] || {};
    throw new Error(`eBay ${callName}: ${e.LongMessage || e.ShortMessage || "failed"}`);
  }
  return r;
}

export type ListingSummary = { itemId: string; title: string };

export async function activeListingsPage(token: string, page: number, perPage: number) {
  const r = await trading(
    "GetMyeBaySelling",
    `<ActiveList><Include>true</Include><Pagination><EntriesPerPage>${perPage}</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination></ActiveList>
<DetailLevel>ReturnAll</DetailLevel>`,
    token
  );
  const list = r.ActiveList || {};
  const items: ListingSummary[] = ((list.ItemArray && list.ItemArray.Item) || []).map(
    (i: { ItemID: string | number; Title: string }) => ({ itemId: String(i.ItemID), title: String(i.Title || "") })
  );
  const totalPages = Number(list.PaginationResult?.TotalNumberOfPages || (items.length ? 1 : 0));
  const totalItems = Number(list.PaginationResult?.TotalNumberOfEntries || items.length);
  return { items, totalPages, totalItems };
}

export type ListingDetails = {
  itemId: string;
  title: string;
  descriptionHtml: string;
  pricePence: number;
  pictures: string[];
  categoryId: string;
  categoryName: string;
};

function num(v: unknown) {
  if (v && typeof v === "object" && "#text" in (v as Record<string, unknown>)) return Number((v as { "#text": unknown })["#text"]);
  return Number(v);
}

export async function getItem(token: string, itemId: string): Promise<ListingDetails> {
  const r = await trading(
    "GetItem",
    `<ItemID>${itemId}</ItemID><DetailLevel>ReturnAll</DetailLevel><IncludeItemSpecifics>true</IncludeItemSpecifics>`,
    token
  );
  const it = r.Item?.[0] || r.Item || {};
  const price = num(it.SellingStatus?.CurrentPrice) || num(it.BuyItNowPrice) || num(it.StartPrice) || 0;
  const pics: string[] = (it.PictureDetails?.PictureURL || []).map(String);
  return {
    itemId: String(it.ItemID || itemId),
    title: String(it.Title || ""),
    descriptionHtml: String(it.Description || ""),
    pricePence: Math.round(price * 100),
    pictures: pics.map((u) => u.replace(/\$_\d+\.(JPG|PNG|jpg|png)/, "$_57.$1").replace(/s-l\d+\./, "s-l1600.")),
    categoryId: String(it.PrimaryCategory?.CategoryID || ""),
    categoryName: String(it.PrimaryCategory?.CategoryName || ""),
  };
}

// ---------- helpers for turning a listing into a site draft ----------

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

/**
 * Best guess of the site category from eBay's category name and the title.
 * Whole words only (update 115): "Collectables"/"Tableware" are not tables and
 * "Manchester" is not a chest, so plates no longer land in Furniture.
 */
export function guessCategory(categoryName: string, title: string): SiteCategory {
  return guessPlacement(categoryName, title).category;
}

type SiteCategory = import("@/lib/products").CategorySlug;

export function guessPlacement(categoryName: string, title: string): { category: SiteCategory; subcategory: string | null } {
  const t = `${categoryName} ${title}`.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  const W = (words: string) => new RegExp(`\\b(${words})\\b`);

  // Coins first: "sovereign", "crown" etc. would otherwise read as jewellery.
  if (has(W("coins?|sovereigns?|half sovereign|shillings?|florins?|guineas?|farthings?|half crowns?|krugerrands?|bullion|numismatics?|proof set"))) {
    return { category: "jewelry", subcategory: "Coins" };
  }
  // eBay's own category says furniture → trust it (a "china cabinet" is still a cabinet).
  if (/\bfurniture\b/i.test(categoryName)) return { category: "furniture", subcategory: null };
  // Update 121: watches have their own category.
  if (has(W("pocket watch|pocket watches|hunter|half hunter"))) return { category: "watches", subcategory: "Pocket Watches" };
  if (has(W("watch|watches|wristwatch|chronograph"))) return { category: "watches", subcategory: "Wristwatches" };
  // Update 122: clocks live in "Watches & Clocks".
  if (has(W("clock|clocks|timepiece|longcase|carriage clock|mantel clock|bracket clock|wall clock"))) return { category: "watches", subcategory: "Clocks" };
  // Update 117: silverware (not silver jewellery) → Silver.
  const isSilver = has(W("silver|sterling|hallmarked|epns|silver ?plated?"));
  if (has(W("medals?|medallions?"))) return { category: "jewelry", subcategory: "Medals" };
  if (isSilver) {
    const sub: [string, string][] = [
      ["salvers?|trays?|waiter|card tray", "Salvers & Trays"],
      ["teapots?|coffee ?pots?|tea set|tea service|cream jug|milk jug|sugar bowl|tea caddy|caddy spoon|hot water jug", "Tea & Coffee"],
      ["spoons?|forks?|ladles?|cutlery|flatware|sugar tongs|butter knife|fish knives|canteen", "Cutlery & Flatware"],
      ["candlesticks?|candelabra|chambersticks?", "Candlesticks"],
      ["vesta|snuff ?box|card case|cigarette case|pill ?box|trinket box|boxes|box|cases?|compact", "Boxes & Cases"],
      ["rattles?|christening|napkin rings?|teething|baby", "Christening & Baby"],
      ["trophy|trophies|challenge cup|goblets?|tankards?|cups?", "Cups & Trophies"],
      ["hand mirror|brush|dressing table|vanity|scent bottle|perfume bottle|pin cushion|hair tidy|button hook", "Dressing Table"],
    ];
    const isObject = has(W("salvers?|trays?|teapots?|coffee ?pots?|jugs?|spoons?|forks?|ladles?|cutlery|flatware|candlesticks?|candelabra|vesta|snuff ?box|card case|cigarette case|pill ?box|trinket box|boxes|box|rattles?|christening|napkin rings?|trophy|challenge cup|goblets?|tankards?|mug|cups?|hand mirror|dressing table|scent bottle|perfume bottle|pin cushion|pepper|salt|cruet|mustard|toast rack|bowls?|dish|purse|thimble|photo frame|frame|vase|sauce boat|tureen|basket|coasters?|ornament|figure|model|mill"));
    if (isObject) {
      if (has(W("epns|silver ?plated?|plated"))) return { category: "silver", subcategory: "Silver Plate" };
      for (const [words, name] of sub) if (has(W(words))) return { category: "silver", subcategory: name };
      return { category: "silver", subcategory: "Novelties & Collectables" };
    }
  }
  if (has(W("jewellery|jewelry|jewel|rings?|necklaces?|pendants?|bracelets?|earrings?|brooch|brooches|cufflinks?|medals?|bangles?|lockets?|charms?"))) {
    return { category: "jewelry", subcategory: null };
  }
  // Paintings and prints first (a painting *of* a vase is still a painting).
  if (has(W("paintings?|oil on (canvas|board|panel)|watercolou?rs?|etchings?|lithographs?|engravings?|prints?|drawings?"))) {
    return { category: "art", subcategory: has(W("paintings?|oil on (canvas|board|panel)|watercolou?rs?")) ? "Paintings" : "Prints and drawings" };
  }
  // Update 121: porcelain, pottery and glass → Ceramics & Glass.
  const ceramic = has(W("porcelain|china|pottery|ceramics?|stoneware|earthenware|faience|majolica|delft|meissen|sitzendorf|dresden|royal copenhagen|doulton|wedgwood|moorcroft|worcester|minton|spode|staffordshire|limoges|herend|lladro|capodimonte|carlton ware|clarice cliff|poole"));
  const glass = has(W("glass|glassware|crystal|murano|lalique|whitefriars|venetian|decanters?|vaseline"));
  if (ceramic || glass) {
    let sub: string | null = null;
    if (has(W("figurines?|figures?|statues?|statuettes?|groups?"))) sub = "Figurines";
    else if (has(W("vases?|jardinieres?|urns?"))) sub = glass && !ceramic ? "Art Glass" : "Vases";
    else if (has(W("plates?|dish|dishes|bowls?|cups?|saucers?|teapots?|tea set|tea service|dinner service|jugs?|tureens?|tableware|dinnerware|comports?|tazza"))) sub = glass && !ceramic ? "Glassware" : "Tableware";
    else if (glass) sub = has(W("murano|lalique|whitefriars|art glass|venetian")) ? "Art Glass" : "Glassware";
    else sub = has(W("pottery|stoneware|earthenware|studio")) ? "Pottery" : "Porcelain";
    return { category: "ceramics", subcategory: sub };
  }
  if (has(W("tribal|african|oceanic|ethnographic|tuareg"))) return { category: "art", subcategory: "Tribal & World" };
  if (!has(W("wood|wooden|carved|treen|brass|copper|pewter|tin")) && has(W("plates?|dish|dishes|bowls?|cups?|saucers?|teapots?|tea set|tea service|dinner service|jugs?|tureens?|tableware|dinnerware"))) {
    return { category: "ceramics", subcategory: "Tableware" };
  }
  if (has(W("furniture|chairs?|tables?|desks?|cabinets?|chests?|drawers|wardrobes?|sideboards?|bookcases?|dressers?|stools?|benches|bench|sofas?|armchairs?|beds?|trunks?|commodes?|bureaus?|bureau|plant stand|jardiniere stand"))) {
    return { category: "furniture", subcategory: null };
  }
  // Everything else → Art & Decor.
  if (has(W("mirrors?"))) return { category: "art", subcategory: "Mirrors" };
  if (has(W("sculptures?|bronzes?|busts?"))) return { category: "art", subcategory: "Sculpture" };
  if (has(W("photographs?|photography"))) return { category: "art", subcategory: "Photography" };
  if (has(W("candlesticks?|candelabra"))) return { category: "art", subcategory: "Candlesticks" };
  if (has(W("boxes|box|caskets?|tea caddy"))) return { category: "art", subcategory: "Boxes" };
  if (has(W("tribal|african|oceanic|ethnographic|tuareg|asian|chinese|japanese|islamic|ottoman"))) return { category: "art", subcategory: "Tribal & World" };
  if (has(W("textiles?|tapestry|tapestries|quilts?|samplers?|embroidery|lace|rugs?"))) return { category: "art", subcategory: "Textiles" };
  if (has(W("ornaments?|figurines?|figures?|statues?"))) return { category: "art", subcategory: "Ornaments" };
  return { category: "art", subcategory: has(W("art")) ? null : "Collectables" };
}

// ---------- two-way sync helpers (update 107) ----------

/** Every ItemID found anywhere inside an XML-parsed object. */
function collectItemIds(node: unknown, out: Set<string>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectItemIds(n, out));
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "ItemID" && (typeof v === "string" || typeof v === "number")) out.add(String(v));
    else collectItemIds(v, out);
  }
}

/** Item IDs of listings that SOLD on eBay in the last `days` days (max 60). */
export async function soldItemIds(token: string, days = 30) {
  const ids = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const r = await trading(
      "GetMyeBaySelling",
      `<SoldList><Include>true</Include><DurationInDays>${days}</DurationInDays><Pagination><EntriesPerPage>200</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination></SoldList>`,
      token
    );
    const list = r.SoldList || {};
    collectItemIds(list.OrderTransactionArray, ids);
    const pages = Number(list.PaginationResult?.TotalNumberOfPages || 1);
    if (page >= pages) break;
  }
  return ids;
}

/** All ACTIVE listings (id + title), 200 per request. */
export async function allActiveListings(token: string) {
  const out: ListingSummary[] = [];
  for (let page = 1; page <= 20; page++) {
    const { items, totalPages } = await activeListingsPage(token, page, 200);
    out.push(...items);
    if (page >= totalPages) break;
  }
  return out;
}

/** Ends an eBay listing because the item sold elsewhere. Already-ended counts as done. */
export async function endListing(token: string, itemId: string) {
  try {
    await trading(
      "EndItem",
      `<ItemID>${itemId}</ItemID><EndingReason>NotAvailable</EndingReason>`,
      token
    );
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already been closed|already ended|has ended|is closed/i.test(msg)) return { ok: true as const };
    return { ok: false as const, error: msg };
  }
}
