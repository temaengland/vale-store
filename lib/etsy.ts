import "server-only";
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { absoluteImageUrl } from "@/lib/instagram";
import { parcelSize, FREE_DELIVERY_FROM, TRACKED48_SMALL, TRACKED48_MEDIUM } from "@/lib/shipping";

// Etsy shop sync (update 142). Etsy Open API v3, seller app "charmchase-shop-sync".
// Env (Vercel): ETSY_API_KEY (keystring), ETSY_SHARED_SECRET.
// One-time "Connect Etsy" in admin (OAuth 2 + PKCE) → tokens in app_settings.
// Items are sent as DRAFT listings; Artem checks and publishes them.
// Which site item is which Etsy listing: app_settings "etsy_map".

const API = "https://api.etsy.com/v3/application";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const AUTH_URL = "https://www.etsy.com/oauth/connect";
export const ETSY_CALLBACK = "https://www.charmchase.co.uk/api/admin/etsy/callback";
const SCOPES = "listings_r listings_w listings_d shops_r shops_w transactions_r";

const TOKEN_KEY = "etsy_token";
const MAP_KEY = "etsy_map";
const TAXO_KEY = "etsy_taxonomy";
const SHIP_KEY = "etsy_shipping_profiles";
const LAST_KEY = "etsy_sync_last";
const SETTINGS_KEY = "etsy_settings";

export type EtsySettings = { markup: number };
export async function etsySettings() {
  return readJson<EtsySettings>(SETTINGS_KEY, { markup: 0 });
}
export async function saveEtsySettings(v: EtsySettings) {
  const markup = Math.max(0, Math.min(50, Math.round(Number(v.markup) || 0)));
  await writeJson(SETTINGS_KEY, { markup });
  return { markup };
}

/** Site price + markup, rounded up: whole pounds under £100, then to £5. */
export function etsyPrice(pence: number, markup: number) {
  if (!markup) return pence;
  const pounds = (pence / 100) * (1 + markup / 100);
  const r = pounds < 100 ? Math.ceil(pounds) : Math.ceil(pounds / 5) * 5;
  return r * 100;
}

export const MAX_ETSY_PHOTOS = 10;

// ---------- small helpers ----------

function db() {
  return supabaseAdmin();
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
    return data ? (JSON.parse(data.value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await db().from("app_settings").upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
}

function keystring() {
  return (process.env.ETSY_API_KEY || "").trim();
}

function apiKeyHeader() {
  const secret = (process.env.ETSY_SHARED_SECRET || "").trim();
  return secret ? `${keystring()}:${secret}` : keystring();
}

export function etsyConfigured() {
  return Boolean(keystring() && (process.env.ETSY_SHARED_SECRET || "").trim());
}

function errText(data: unknown, status: number) {
  const d = data as { error?: string; error_description?: string; message?: string } | null;
  return (d && (d.error_description || d.error || d.message)) || `Etsy error ${status}`;
}

// ---------- OAuth (PKCE) ----------

type Tokens = {
  access: string;
  refresh: string;
  expiresAt: number;
  userId: string;
  shopId?: number;
  shopName?: string;
  shopUrl?: string;
  connectedAt: string;
};

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Returns the Etsy login URL and the secret pair to keep in a cookie. */
export function startConnect() {
  const verifier = b64url(randomBytes(48));
  const state = b64url(randomBytes(12));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const q = new URLSearchParams({
    response_type: "code",
    client_id: keystring(),
    redirect_uri: ETSY_CALLBACK,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return { url: `${AUTH_URL}?${q.toString()}`, cookie: `${state}.${verifier}` };
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-api-key": apiKeyHeader() },
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(errText(data, res.status));
  return data as { access_token: string; refresh_token: string; expires_in: number };
}

export async function finishConnect(code: string, state: string, cookie: string | undefined) {
  const [savedState, verifier] = (cookie || "").split(".");
  if (!savedState || !verifier || savedState !== state) throw new Error("Etsy login expired — press Connect Etsy again.");
  const t = await tokenRequest({
    grant_type: "authorization_code",
    client_id: keystring(),
    redirect_uri: ETSY_CALLBACK,
    code,
    code_verifier: verifier,
  });
  const tokens: Tokens = {
    access: t.access_token,
    refresh: t.refresh_token,
    expiresAt: Date.now() + (t.expires_in - 120) * 1000,
    userId: t.access_token.split(".")[0],
    connectedAt: new Date().toISOString(),
  };
  await writeJson(TOKEN_KEY, tokens);
  // Find the shop.
  const shops = await etsy<{ shop_id?: number; shop_name?: string; url?: string; results?: { shop_id: number; shop_name: string; url: string }[] }>(
    "GET",
    `/users/${tokens.userId}/shops`
  );
  const shop = shops.results?.[0] || (shops.shop_id ? (shops as { shop_id: number; shop_name: string; url: string }) : null);
  if (!shop) throw new Error("No Etsy shop found on this account.");
  await writeJson(TOKEN_KEY, { ...tokens, shopId: shop.shop_id, shopName: shop.shop_name, shopUrl: shop.url });
  return shop.shop_name;
}

async function getTokens(): Promise<Tokens | null> {
  const t = await readJson<Tokens | null>(TOKEN_KEY, null);
  if (!t) return null;
  if (Date.now() < t.expiresAt) return t;
  const r = await tokenRequest({ grant_type: "refresh_token", client_id: keystring(), refresh_token: t.refresh });
  const next: Tokens = { ...t, access: r.access_token, refresh: r.refresh_token || t.refresh, expiresAt: Date.now() + (r.expires_in - 120) * 1000 };
  await writeJson(TOKEN_KEY, next);
  return next;
}

export async function etsyStatus() {
  if (!etsyConfigured()) return { configured: false as const };
  const t = await readJson<Tokens | null>(TOKEN_KEY, null);
  return {
    configured: true as const,
    aiConfigured: Boolean((process.env.ANTHROPIC_API_KEY || "").trim()),
    settings: await etsySettings(),
    connected: Boolean(t?.shopId),
    shopName: t?.shopName,
    shopUrl: t?.shopUrl,
  };
}

// ---------- requests ----------

async function etsy<T>(method: string, path: string, body?: Record<string, unknown> | FormData, json = false): Promise<T> {
  const t = await getTokens();
  if (!t) throw new Error("Etsy is not connected — press Connect Etsy.");
  const headers: Record<string, string> = { "x-api-key": apiKeyHeader(), Authorization: `Bearer ${t.access}` };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body && json) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  } else if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null || v === "") continue;
      p.append(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    payload = p.toString();
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload, cache: "no-store" });
  if (res.status === 204) return {} as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errText(data, res.status));
  return data as T;
}

async function shop() {
  const t = await getTokens();
  if (!t?.shopId) throw new Error("Etsy is not connected — press Connect Etsy.");
  return t.shopId;
}

// ---------- the map site item → Etsy listing ----------

export type EtsyLink = { listingId: number; state: "draft" | "active" | "inactive" | "removed" | "sold"; at: string };
export async function etsyMap() {
  return readJson<Record<string, EtsyLink>>(MAP_KEY, {});
}
async function setLink(productId: string, link: EtsyLink | null) {
  const map = await etsyMap();
  if (link) map[productId] = link;
  else delete map[productId];
  await writeJson(MAP_KEY, map);
}

// ---------- when made (Etsy only allows vintage = 20+ years old) ----------

export const WHEN_MADE = [
  "1990s", "1980s", "1970s", "1960s", "1950s", "1940s", "1930s", "1920s", "1910s", "1900s", "1800s", "1700s", "before_1700", "before_2007", "2000_2006",
] as const;
export const WHEN_MADE_LABEL: Record<string, string> = {
  "2000_2006": "2000–2006",
  before_2007: "Before 2007 (vintage, decade unknown)",
  before_1700: "Before 1700",
  "1800s": "1800s (19th century)",
  "1700s": "1700s (18th century)",
};
const MODERN = /\b(pandora|swatch|2010s?|201\d|202\d|brand new|new with tags|bnwt|skateboard|longboard|reproduction|replica)\b/i;

function decadeOf(y: number) {
  if (y < 1700) return "before_1700";
  if (y < 1800) return "1700s";
  if (y < 1900) return "1800s";
  if (y < 2000) return `${Math.floor(y / 10) * 10}s`;
  if (y <= 2006) return "2000_2006";
  return null;
}

/** Best guess of Etsy's "when made"; null = not vintage / unknown. */
export function guessWhenMade(p: { name: string; description?: string | null; era?: string | null }): string | null {
  const head = `${p.name} ${p.era || ""}`;
  const all = `${head} ${p.description || ""}`;
  if (MODERN.test(head)) return null;
  const year = head.match(/\b(1[5-9]\d\d|200[0-6])s?\b/) || (p.description || "").match(/\b(?:c\.?|circa|made in|dated?)\s*(1[5-9]\d\d)\b/i);
  if (year) return decadeOf(Number(year[1]));
  const word = (t: string): string | null => {
    if (/\b(georgian|18th century|eighteenth century|queen anne|william (&|and) mary)\b/i.test(t)) return "1700s";
    if (/\b(17th century|16th century|elizabeth i|charles ii)\b/i.test(t)) return "before_1700";
    if (/\b(regency|william iv|victorian|19th century|nineteenth century)\b/i.test(t)) return "1800s";
    if (/\b(edwardian|art nouveau|belle [eé]poque)\b/i.test(t)) return "1900s";
    if (/\b(art ?deco|1920s)\b/i.test(t)) return "1920s";
    if (/\b(1930s)\b/i.test(t)) return "1930s";
    if (/\b(1940s|wwii|ww2)\b/i.test(t)) return "1940s";
    if (/\b(mid[- ]?century|1950s)\b/i.test(t)) return "1950s";
    if (/\b(1960s|sixties)\b/i.test(t)) return "1960s";
    if (/\b(1970s|seventies)\b/i.test(t)) return "1970s";
    if (/\b(1980s)\b/i.test(t)) return "1980s";
    if (/\b(1990s)\b/i.test(t)) return "1990s";
    return null;
  };
  const w = word(head) || word(all);
  if (w) return w;
  if (/\b(antique|vintage|retro)\b/i.test(all) && !MODERN.test(all)) return "before_2007";
  return null;
}

// ---------- taxonomy (Etsy categories) ----------

type Node = { id: number; name: string; children?: Node[] };
type Leaf = { id: number; path: string };

async function taxonomy(): Promise<Leaf[]> {
  const cached = await readJson<{ at: number; leaves: Leaf[] } | null>(TAXO_KEY, null);
  if (cached && Date.now() - cached.at < 30 * 86400000 && cached.leaves.length) return cached.leaves;
  const res = await fetch(`${API}/seller-taxonomy/nodes`, { headers: { "x-api-key": apiKeyHeader() }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errText(data, res.status));
  const leaves: Leaf[] = [];
  const walk = (n: Node, trail: string[]) => {
    const t = [...trail, n.name];
    if (!n.children || !n.children.length) leaves.push({ id: n.id, path: t.join(" > ") });
    else n.children.forEach((c) => walk(c, t));
  };
  (data.results || []).forEach((n: Node) => walk(n, []));
  await writeJson(TAXO_KEY, { at: Date.now(), leaves });
  return leaves;
}

const ROOTS: Record<string, string[]> = {
  jewelry: ["Jewelry", "Accessories"],
  watches: ["Jewelry", "Home & Living"],
  silver: ["Home & Living", "Art & Collectibles", "Jewelry", "Accessories"],
  ceramics: ["Home & Living", "Art & Collectibles"],
  art: ["Art & Collectibles", "Home & Living"],
  furniture: ["Home & Living"],
};

const SYN: [RegExp, string][] = [
  [/\bwatch(es)?\b|wristwatch/i, "watches wrist"],
  [/pocket watch/i, "pocket watches"],
  [/\bclock/i, "clocks"],
  [/\brings?\b/i, "rings"],
  [/brooch/i, "brooches pins"],
  [/necklace|pendant|chain/i, "necklaces pendants"],
  [/earring|studs?\b/i, "earrings"],
  [/bracelet|bangle|cuff/i, "bracelets"],
  [/plates?\b|charger|platter|dish/i, "plates dishes serving"],
  [/vase/i, "vases"],
  [/teapot|cup|saucer|tea set/i, "tea cups teapots"],
  [/painting|oil on|watercolou?r/i, "paintings painting"],
  [/print|poster|etching|lithograph/i, "prints"],
  [/chairs?\b/i, "chairs seating"],
  [/table\b/i, "tables"],
  [/chest of drawers|dresser|cabinet|bookcase|cupboard|wardrobe/i, "storage cabinets dressers bookcases"],
  [/box\b|casket/i, "boxes"],
  [/coin|medal/i, "coins collectibles"],
  [/figurine|figure\b/i, "figurines"],
];

function words(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w.replace(/s$/, ""))
  );
}

/** Up to 25 likely Etsy categories for an item, best first. */
export async function categoryCandidates(p: { name: string; category: string; subcategory?: string | null; description?: string | null }) {
  const leaves = await taxonomy();
  const roots = ROOTS[p.category] || ["Home & Living", "Art & Collectibles"];
  let text = `${p.name} ${p.subcategory || ""}`;
  for (const [re, add] of SYN) if (re.test(text)) text += ` ${add}`;
  const g = `${p.name} ${(p.description || "").slice(0, 400)}`;
  if (/\b(ladies|lady'?s|women'?s?|womens|her)\b/i.test(g)) text += " women";
  else if (/\b(men'?s|mens|gents?|gentleman'?s?)\b/i.test(g)) text += " men";
  else if (/watch/i.test(text)) text += " unisex";
  const want = words(text);
  const scored = leaves
    .filter((l) => roots.some((r) => l.path.startsWith(r + " >")))
    .map((l) => {
      const w = words(l.path.split(" > ").slice(1).join(" "));
      const last = words(l.path.split(" > ").pop() || "");
      let s = 0;
      for (const x of want) {
        if (last.has(x)) s += 3;
        else if (w.has(x)) s += 1;
      }
      s -= roots.indexOf(roots.find((r) => l.path.startsWith(r))!) * 0.5;
      return { ...l, s };
    })
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, 25).map(({ id, path }) => ({ id, path }));
}

// ---------- shipping (same rules as the site, update 130) ----------

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  subcategory: string | null;
  era: string | null;
  images: string[] | null;
  image: string | null;
  status: string | null;
  is_draft: boolean | null;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  shipping_cost: number | null;
};

const PRODUCT_COLS =
  "id, name, description, price, category, subcategory, era, images, image, status, is_draft, weight_grams, length_cm, width_cm, height_cm, shipping_cost";

/** UK delivery price on Etsy (pence) and a label for admin. */
export function etsyShipping(p: ProductRow) {
  const size = parcelSize(p);
  if (size === "large") {
    const c = p.shipping_cost && p.shipping_cost > 0 ? p.shipping_cost : 7000;
    return { pence: c, label: `Courier £${(c / 100).toFixed(2)} (large item)` };
  }
  if (p.price >= FREE_DELIVERY_FROM) return { pence: 0, label: "Free UK delivery (Royal Mail Special Delivery)" };
  return size === "medium"
    ? { pence: TRACKED48_MEDIUM, label: "Royal Mail Tracked 48 £12.95" }
    : { pence: TRACKED48_SMALL, label: "Royal Mail Tracked 48 £4.95" };
}

async function shippingProfileFor(pence: number) {
  const shopId = await shop();
  const saved = await readJson<Record<string, number>>(SHIP_KEY, {});
  if (saved[String(pence)]) return saved[String(pence)];
  const title = pence === 0 ? "CharmChase — Free UK delivery" : `CharmChase — UK £${(pence / 100).toFixed(2)}`;
  // Reuse one with the same name if it already exists on Etsy.
  const list = await etsy<{ results: { shipping_profile_id: number; title: string }[] }>("GET", `/shops/${shopId}/shipping-profiles`);
  let id = list.results?.find((r) => r.title === title)?.shipping_profile_id;
  if (!id) {
    const made = await etsy<{ shipping_profile_id: number }>("POST", `/shops/${shopId}/shipping-profiles`, {
      title,
      origin_country_iso: "GB",
      destination_country_iso: "GB",
      primary_cost: (pence / 100).toFixed(2),
      secondary_cost: (pence / 100).toFixed(2),
      min_processing_time: 1,
      max_processing_time: 2,
      processing_time_unit: "business_days",
      min_delivery_days: 1,
      max_delivery_days: pence === 0 ? 2 : 3,
    });
    id = made.shipping_profile_id;
  }
  saved[String(pence)] = id;
  await writeJson(SHIP_KEY, saved);
  return id;
}

async function readinessStateId() {
  const shopId = await shop();
  try {
    const list = await etsy<{ results: { readiness_state_id: number; readiness_state: string }[] }>(
      "GET",
      `/shops/${shopId}/readiness-state-definitions`
    );
    const r = list.results?.find((x) => x.readiness_state === "ready_to_ship");
    if (r) return r.readiness_state_id;
    const made = await etsy<{ readiness_state_id: number }>("POST", `/shops/${shopId}/readiness-state-definitions`, {
      readiness_state: "ready_to_ship",
      min_processing_time: 1,
      max_processing_time: 2,
      processing_time_unit: "days",
    });
    return made.readiness_state_id;
  } catch {
    return undefined;
  }
}

async function returnPolicyId() {
  const shopId = await shop();
  try {
    const list = await etsy<{ results: { return_policy_id: number; accepts_returns: boolean; return_deadline: number | null }[] }>(
      "GET",
      `/shops/${shopId}/policies/return`
    );
    const r = list.results?.find((x) => x.accepts_returns && x.return_deadline === 14) || list.results?.[0];
    if (r) return r.return_policy_id;
    const made = await etsy<{ return_policy_id: number }>("POST", `/shops/${shopId}/policies/return`, {
      accepts_returns: true,
      accepts_exchanges: false,
      return_deadline: 14,
    });
    return made.return_policy_id;
  } catch {
    return undefined;
  }
}

// ---------- listing text ----------

const FOOTER = `

—
Dispatched from Evesham, Worcestershire, UK. Carefully packed and sent tracked; items over £150 go free by Royal Mail Special Delivery (signed for, insured).
All our pieces are genuine antique or vintage and described honestly — please look at every photo, as they form part of the description. Any questions, just send us a message.`;

export function cleanEtsyTitle(s: string) {
  let t = s
    .replace(/[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const ch of ["%", ":", "&", "+"]) {
    let seen = false;
    t = t.replace(new RegExp(`\\${ch}`, "g"), (m) => {
      if (seen) return ch === "&" ? "and" : " ";
      seen = true;
      return m;
    });
  }
  return t.replace(/\s+/g, " ").slice(0, 140).trim();
}

export function cleanTag(s: string) {
  return s
    .replace(/[^\p{L}\p{Nd}\p{Zs}\-']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 20)
    .trim();
}

function cleanMaterial(s: string) {
  return s.replace(/[^\p{L}\p{Nd}\p{Zs}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 45);
}

function etsyDescription(desc: string | null, name: string) {
  const body = (desc || name)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b(www\.)?charmchase\.co\.uk\b/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return body + FOOTER;
}

const STOP = new Set(["and", "with", "the", "for", "of", "in", "a", "an", "uk", "size", "approx", "rare", "lovely", "beautiful", "stunning", "genuine", "authentic", "signed", "working", "boxed", "fully", "tested", "hallmarked"]);

function ruleTags(p: ProductRow, when: string | null) {
  const t: string[] = [];
  const add = (x: string) => {
    const c = cleanTag(x);
    if (c && c.length > 2 && c.length <= 20 && !t.includes(c)) t.push(c);
  };
  const text = `${p.name} ${p.description || ""}`;
  const sub = (p.subcategory || p.category).toLowerCase().replace(/es$|s$/, "");
  // Pairs of words from the title ("cartier must", "roman dial"…).
  const w = p.name
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1 && !STOP.has(x) && !/^\d+(cm|mm|g|ct)?$/.test(x));
  for (let i = 0; i < w.length - 1 && t.length < 6; i++) add(`${w[i]} ${w[i + 1]}`);
  if (when && /^\d{4}s$/.test(when)) add(`${when} ${sub}`.slice(0, 20).trim());
  const era = (text.match(/\b(victorian|edwardian|georgian|regency|art deco|art nouveau|mid century|antique|vintage)\b/i) || [])[1];
  if (era) add(`${era.toLowerCase()} ${sub}`);
  for (const m of ["sterling silver", "9ct gold", "18ct gold", "diamond", "porcelain", "mahogany", "oak", "brass", "enamel", "pearl"])
    if (new RegExp(`\\b${m}\\b`, "i").test(text)) add(m);
  add(`vintage ${sub}`);
  add(`antique ${sub}`);
  if (/\b(ladies|women|her)\b/i.test(text) || p.category === "jewelry") add("gift for her");
  add("british antique");
  add("collectible");
  return t.slice(0, 13);
}

export type EtsyDraft = {
  title: string;
  description: string;
  price: number; // pence
  whenMade: string | null;
  taxonomyId: number | null;
  tags: string[];
  materials: string[];
};

/** Claude writes an Etsy-style title, 13 tags and materials (falls back to rules). */
let lastAiError = "";

async function aiCopy(p: ProductRow, candidates: { id: number; path: string }[], when: string | null) {
  lastAiError = "";
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    lastAiError = "ANTHROPIC_API_KEY is not set in Vercel — title and tags made by simple rules.";
    return null;
  }
  const model = (process.env.REELS_AI_MODEL || "claude-haiku-4-5").trim();
  const prompt = `You prepare an Etsy listing (UK seller of genuine antiques & vintage) from this item.

Item title: ${p.name}
Section: ${p.category}${p.subcategory ? " / " + p.subcategory : ""}${p.era ? "\nEra: " + p.era : ""}
Price: £${(p.price / 100).toFixed(0)}
Description:
${(p.description || "").slice(0, 2500)}

Etsy categories to choose from (id: path):
${candidates.map((c) => `${c.id}: ${c.path}`).join("\n")}

Allowed "when_made" values: ${WHEN_MADE.join(", ")}. Our guess: ${when || "unknown"}.

Return JSON only:
{"title":"...","tags":["..."],"materials":["..."],"when_made":"...","taxonomy_id":123}
Rules:
- title: max 140 characters, British English, most important search words first (what it is, maker/brand, material, era), no ALL CAPS words, no emojis, no price, use "&" at most once and ":" "%" "+" at most once.
- tags: exactly 13, each max 20 characters, lowercase, only letters/numbers/spaces/hyphens, varied buyer search phrases (e.g. "victorian brooch", "antique jewellery", "gift for her"), no repeats of the same word set.
- materials: up to 5, only materials actually stated in the listing.
- when_made: the decade from the listing if stated or clearly implied by the era; otherwise "before_2007". Never invent a date.
- taxonomy_id: the single best id from the list above.
Never invent makers, dates, hallmarks or stones that are not in the listing.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastAiError = `AI: ${data?.error?.message || res.status}`;
      return null;
    }
    const text: string = data?.content?.[0]?.text || "";
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      title: cleanEtsyTitle(String(j.title || "")),
      tags: (Array.isArray(j.tags) ? j.tags : []).map((x: unknown) => cleanTag(String(x))).filter((x: string) => x.length > 1),
      materials: (Array.isArray(j.materials) ? j.materials : []).map((x: unknown) => cleanMaterial(String(x))).filter(Boolean),
      whenMade: (WHEN_MADE as readonly string[]).includes(j.when_made) ? (j.when_made as string) : null,
      taxonomyId: candidates.some((c) => c.id === Number(j.taxonomy_id)) ? Number(j.taxonomy_id) : null,
    };
  } catch (e) {
    lastAiError = `AI: ${e instanceof Error ? e.message : "no answer"}`;
    return null;
  }
}

async function product(id: string) {
  const { data, error } = await db().from("products").select(PRODUCT_COLS).eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Item not found.");
  return data as ProductRow;
}

function photos(p: ProductRow) {
  return (p.images && p.images.length ? p.images : p.image ? [p.image] : []).map((u) => absoluteImageUrl(u));
}

/** What the Etsy listing will look like — shown in admin before sending. */
export async function prepareEtsy(productId: string) {
  const p = await product(productId);
  const guess = guessWhenMade(p);
  const candidates = await categoryCandidates(p);
  const ai = await aiCopy(p, candidates, guess);
  const whenMade = guess && guess !== "before_2007" ? guess : ai?.whenMade || guess;
  const tags = [...new Set([...(ai?.tags || []), ...ruleTags(p, whenMade)])].slice(0, 13);
  const draft: EtsyDraft = {
    title: ai?.title || cleanEtsyTitle(p.name),
    description: etsyDescription(p.description, p.name),
    price: etsyPrice(p.price, (await etsySettings()).markup),
    whenMade: MODERN.test(p.name) ? null : whenMade,
    taxonomyId: ai?.taxonomyId || candidates[0]?.id || null,
    tags,
    materials: ai?.materials?.slice(0, 5) || [],
  };
  const map = await etsyMap();
  return {
    draft,
    candidates,
    photos: photos(p).slice(0, MAX_ETSY_PHOTOS),
    shipping: etsyShipping(p).label,
    link: map[p.id] || null,
    vintageOk: Boolean(draft.whenMade),
    aiNote: ai ? "" : lastAiError,
    sitePrice: p.price,
  };
}

/** Creates the Etsy draft (or updates the existing one). */
export async function sendToEtsy(productId: string, d: EtsyDraft) {
  const p = await product(productId);
  if (p.status === "sold") throw new Error("This item is sold.");
  if (!d.whenMade || !(WHEN_MADE as readonly string[]).includes(d.whenMade))
    throw new Error("Choose when it was made — Etsy only allows vintage items (20+ years old).");
  if (!d.taxonomyId) throw new Error("Choose an Etsy category.");
  const shopId = await shop();
  const title = cleanEtsyTitle(d.title);
  const tags = [...new Set(d.tags.map(cleanTag).filter(Boolean))].slice(0, 13);
  const materials = d.materials.map(cleanMaterial).filter(Boolean).slice(0, 13);
  const ship = etsyShipping(p);
  const map = await etsyMap();
  const existing = map[p.id];

  const fields: Record<string, unknown> = {
    title,
    description: d.description.slice(0, 60000),
    price: (d.price / 100).toFixed(2),
    who_made: "someone_else",
    when_made: d.whenMade,
    is_supply: false,
    taxonomy_id: d.taxonomyId,
    tags: tags.length ? tags : undefined,
    materials: materials.length ? materials : undefined,
    shipping_profile_id: await shippingProfileFor(ship.pence),
    return_policy_id: await returnPolicyId(),
    readiness_state_id: await readinessStateId(),
    should_auto_renew: true,
    type: "physical",
  };
  if (p.weight_grams) {
    fields.item_weight = p.weight_grams;
    fields.item_weight_unit = "g";
  }
  if (p.length_cm && p.width_cm && p.height_cm) {
    fields.item_length = p.length_cm;
    fields.item_width = p.width_cm;
    fields.item_height = p.height_cm;
    fields.item_dimensions_unit = "cm";
  }

  if (existing && existing.state !== "removed" && existing.state !== "sold") {
    delete fields.type;
    await etsy("PATCH", `/shops/${shopId}/listings/${existing.listingId}`, fields);
    await setLink(p.id, { ...existing, at: new Date().toISOString() });
    return { listingId: existing.listingId, updated: true, photos: 0 };
  }

  const made = await etsy<{ listing_id: number }>("POST", `/shops/${shopId}/listings`, { quantity: 1, ...fields });
  const listingId = made.listing_id;
  await setLink(p.id, { listingId, state: "draft", at: new Date().toISOString() });

  let uploaded = 0;
  const list = photos(p).slice(0, MAX_ETSY_PHOTOS);
  for (let i = 0; i < list.length; i++) {
    try {
      const r = await fetch(list[i], { cache: "no-store" });
      if (!r.ok) continue;
      const type = r.headers.get("content-type") || "image/jpeg";
      const blob = new Blob([await r.arrayBuffer()], { type });
      const fd = new FormData();
      fd.append("image", blob, `photo-${i + 1}.${type.includes("png") ? "png" : "jpg"}`);
      fd.append("rank", String(i + 1));
      fd.append("alt_text", title.slice(0, 250));
      await etsy("POST", `/shops/${shopId}/listings/${listingId}/images`, fd);
      uploaded++;
    } catch {
      /* one bad photo must not stop the listing */
    }
  }
  return { listingId, updated: false, photos: uploaded };
}

/** Publishes an Etsy draft (Etsy charges its listing fee). */
export async function publishOnEtsy(productId: string) {
  const map = await etsyMap();
  const link = map[productId];
  if (!link) throw new Error("Send it to Etsy first.");
  const shopId = await shop();
  await etsy("PATCH", `/shops/${shopId}/listings/${link.listingId}`, { state: "active" });
  await setLink(productId, { ...link, state: "active", at: new Date().toISOString() });
}

/** Removes the Etsy listing of items sold elsewhere (draft → deleted, live → inactive). */
export async function endEtsyListingsFor(productIds: string[]) {
  if (!productIds.length || !etsyConfigured()) return [];
  const map = await etsyMap();
  const out: { id: string; ok: boolean; error?: string }[] = [];
  const t = await readJson<Tokens | null>(TOKEN_KEY, null);
  if (!t?.shopId) return out;
  for (const id of productIds) {
    const link = map[id];
    if (!link || link.state === "removed" || link.state === "sold" || link.state === "inactive") continue;
    try {
      if (link.state === "draft") await etsy("DELETE", `/listings/${link.listingId}`);
      else await etsy("PATCH", `/shops/${t.shopId}/listings/${link.listingId}`, { state: "inactive" });
      map[id] = { ...link, state: link.state === "draft" ? "removed" : "inactive", at: new Date().toISOString() };
      out.push({ id, ok: true });
    } catch (e) {
      out.push({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  await writeJson(MAP_KEY, map);
  return out;
}

type Receipt = { receipt_id: number; create_timestamp: number; transactions?: { listing_id: number }[] };

/**
 * Two-way sold sync (runs with the eBay sync every 15 min):
 *  - sold on Etsy → item Sold on the site (and ended on eBay by the caller)
 *  - sold on the site / eBay → Etsy listing removed
 *  - keeps draft/active state in the map up to date.
 */
export type EtsySyncResult = { ok: boolean; skipped?: string; error?: string; soldOnEtsy: string[]; soldNames: string[]; ended: number };

export async function runEtsySync(): Promise<EtsySyncResult> {
  const none = { soldOnEtsy: [], soldNames: [], ended: 0 };
  if (!etsyConfigured()) return { ok: false, skipped: "not configured", ...none };
  const t = await readJson<Tokens | null>(TOKEN_KEY, null);
  if (!t?.shopId) return { ok: false, skipped: "not connected", ...none };
  const shopId = t.shopId;
  const map = await etsyMap();
  const byListing = new Map<number, string>();
  for (const [pid, l] of Object.entries(map)) byListing.set(l.listingId, pid);

  // 1) Sold on Etsy.
  const last = await readJson<{ at: number } | null>(LAST_KEY, null);
  const since = Math.floor(((last?.at ?? Date.now() - 30 * 86400000) - 86400000) / 1000);
  const rec = await etsy<{ results: Receipt[] }>("GET", `/shops/${shopId}/receipts?min_created=${since}&limit=100`);
  const soldIds: string[] = [];
  for (const r of rec.results || [])
    for (const tr of r.transactions || []) {
      const pid = byListing.get(tr.listing_id);
      if (pid && !soldIds.includes(pid)) soldIds.push(pid);
    }
  const soldNames: string[] = [];
  if (soldIds.length) {
    const { data } = await db().from("products").select("id, name, status").in("id", soldIds);
    const toMark = (data || []).filter((p) => p.status !== "sold");
    if (toMark.length) {
      await db().from("products").update({ status: "sold" }).in("id", toMark.map((p) => p.id));
      toMark.forEach((p) => soldNames.push(p.name));
    }
    for (const id of soldIds) if (map[id]) map[id] = { ...map[id], state: "sold", at: new Date().toISOString() };
    await writeJson(MAP_KEY, map);
  }

  // 2) Live/draft state of our listings.
  for (const state of ["active", "draft", "inactive"] as const) {
    try {
      const r = await etsy<{ results: { listing_id: number }[] }>("GET", `/shops/${shopId}/listings?state=${state}&limit=100`);
      for (const l of r.results || []) {
        const pid = byListing.get(l.listing_id);
        if (pid && map[pid] && map[pid].state !== "sold" && map[pid].state !== "removed") map[pid] = { ...map[pid], state };
      }
    } catch {
      /* not fatal */
    }
  }
  await writeJson(MAP_KEY, map);

  // 3) Sold on the site or eBay → remove from Etsy.
  const ids = Object.keys(map).filter((id) => ["draft", "active"].includes(map[id].state));
  let ended = 0;
  if (ids.length) {
    const { data } = await db().from("products").select("id, status").in("id", ids);
    const soldHere = (data || []).filter((p) => p.status === "sold").map((p) => p.id);
    const missing = ids.filter((id) => !(data || []).some((p) => p.id === id));
    const r = await endEtsyListingsFor([...soldHere, ...missing]);
    ended = r.filter((x) => x.ok).length;
  }

  await writeJson(LAST_KEY, { at: Date.now() });
  return { ok: true, soldOnEtsy: soldIds, soldNames, ended };
}

/** Items that can go to Etsy and are not there yet. */
export async function eligibleForEtsy() {
  const { data } = await db()
    .from("products")
    .select(PRODUCT_COLS)
    .neq("status", "sold")
    .or("is_draft.is.null,is_draft.eq.false")
    .order("created_at", { ascending: false });
  const map = await etsyMap();
  const rows = (data || []) as ProductRow[];
  const out = rows.filter((p) => !map[p.id] || map[p.id].state === "removed").filter((p) => photos(p).length > 0);
  return {
    ready: out.filter((p) => guessWhenMade(p)).map((p) => ({ id: p.id, name: p.name })),
    notVintage: out.filter((p) => !guessWhenMade(p)).map((p) => ({ id: p.id, name: p.name })),
  };
}
