import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Instagram API with Instagram Login (app "CharmChase Publisher").
// Env vars (Vercel): INSTAGRAM_ACCESS_TOKEN (secret), INSTAGRAM_USER_ID.
// The long-lived token lasts 60 days; we renew it automatically and keep the
// current one in the Supabase table `app_settings` (see supabase-setup.sql).

const GRAPH = "https://graph.instagram.com";
export const SITE_URL = "https://www.charmchase.co.uk";

const TOKEN_KEY = "instagram_token";
const POST_KEY_PREFIX = "ig_post:";
const RENEW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // renew weekly

type StoredToken = { token: string; envHash: string; expiresAt?: string };
export type PostedInfo = { mediaId: string; permalink?: string; at: string };

function hash(s: string) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export function igUserId() {
  return (process.env.INSTAGRAM_USER_ID || "").trim();
}

function envToken() {
  return (process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
}

export function isConfigured() {
  return Boolean(envToken() && igUserId());
}

// ---- app_settings helpers (fail soft if the table doesn't exist yet) ----

async function readSetting(key: string) {
  try {
    const { data, error } = await supabaseAdmin()
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", key)
      .maybeSingle();
    if (error) return { ok: false as const };
    return { ok: true as const, row: data as { value: string; updated_at: string } | null };
  } catch {
    return { ok: false as const };
  }
}

async function writeSetting(key: string, value: string) {
  try {
    const { error } = await supabaseAdmin()
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

async function readPrefixed(prefix: string) {
  try {
    const { data, error } = await supabaseAdmin()
      .from("app_settings")
      .select("key, value")
      .like("key", `${prefix}%`);
    if (error) return [];
    return (data ?? []) as { key: string; value: string }[];
  } catch {
    return [];
  }
}

// ---- token ----

async function refreshToken(token: string) {
  const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) return null;
  return {
    token: String(data.access_token),
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString()
      : undefined,
  };
}

/**
 * Returns a working token, renewing it if it's older than a week.
 * If the token in Vercel was replaced by hand, the new one wins.
 */
export async function getToken(opts: { allowRefresh?: boolean } = {}) {
  const env = envToken();
  if (!env) return { token: "", canStore: false, renewed: false, expiresAt: undefined as string | undefined };
  const envHash = hash(env);

  const setting = await readSetting(TOKEN_KEY);
  if (!setting.ok) {
    // Table missing — still works, but can't auto-renew.
    return { token: env, canStore: false, renewed: false, expiresAt: undefined };
  }

  let current: StoredToken | null = null;
  let savedAt = 0;
  if (setting.row) {
    try {
      const parsed = JSON.parse(setting.row.value) as StoredToken;
      if (parsed.envHash === envHash && parsed.token) {
        current = parsed;
        savedAt = new Date(setting.row.updated_at).getTime();
      }
    } catch {
      /* ignore bad row */
    }
  }
  if (!current) current = { token: env, envHash };

  if (opts.allowRefresh !== false && Date.now() - savedAt > RENEW_AFTER_MS) {
    const fresh = await refreshToken(current.token);
    if (fresh) {
      const next: StoredToken = { token: fresh.token, envHash, expiresAt: fresh.expiresAt };
      await writeSetting(TOKEN_KEY, JSON.stringify(next));
      return { token: next.token, canStore: true, renewed: true, expiresAt: next.expiresAt };
    }
  }
  return { token: current.token, canStore: true, renewed: false, expiresAt: current.expiresAt };
}

// ---- Graph API calls ----

async function graph(path: string, token: string, params: Record<string, string> = {}, method: "GET" | "POST" = "GET") {
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`;
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? body : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data?.error?.error_user_msg || data?.error?.message || `Instagram error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function getAccount(token: string) {
  const data = await graph("me", token, { fields: "user_id,username" });
  return { username: String(data.username || ""), id: String(data.user_id || data.id || "") };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitReady(containerId: string, token: string) {
  for (let i = 0; i < 25; i++) {
    const d = await graph(containerId, token, { fields: "status_code" });
    if (d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR" || d.status_code === "EXPIRED")
      throw new Error("Instagram couldn't process one of the photos.");
    await sleep(1500);
  }
  throw new Error("Instagram is taking too long to process the photos — try again in a minute.");
}

/** Publishes 1–10 photo URLs (must be public JPEGs) with a caption. */
export async function publishPhotos(imageUrls: string[], caption: string, token: string) {
  const uid = igUserId();
  const urls = imageUrls.slice(0, 10);
  if (!urls.length) throw new Error("This item has no photos.");

  let creationId: string;
  if (urls.length === 1) {
    const c = await graph(`${uid}/media`, token, { image_url: urls[0], caption }, "POST");
    creationId = String(c.id);
  } else {
    const children = await Promise.all(
      urls.map((u) =>
        graph(`${uid}/media`, token, { image_url: u, is_carousel_item: "true" }, "POST").then((c) => String(c.id))
      )
    );
    await Promise.all(children.map((id) => waitReady(id, token)));
    const c = await graph(
      `${uid}/media`,
      token,
      { media_type: "CAROUSEL", children: children.join(","), caption },
      "POST"
    );
    creationId = String(c.id);
  }
  await waitReady(creationId, token);
  const pub = await graph(`${uid}/media_publish`, token, { creation_id: creationId }, "POST");
  const mediaId = String(pub.id);
  let permalink: string | undefined;
  try {
    const m = await graph(mediaId, token, { fields: "permalink" });
    permalink = m.permalink;
  } catch {
    /* not critical */
  }
  return { mediaId, permalink };
}

// ---- Reels (update 109) ----

/**
 * Creates a Reel container. `trial` = Instagram "trial reel": shown to
 * non-followers first and shared to followers automatically if it does well.
 */
export async function createReelContainer(
  videoUrl: string,
  caption: string,
  token: string,
  opts: { coverUrl?: string; trial?: boolean } = {}
) {
  const base: Record<string, string> = {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
  };
  if (opts.coverUrl) base.cover_url = opts.coverUrl;
  if (opts.trial) {
    try {
      const c = await graph(
        `${igUserId()}/media`,
        token,
        { ...base, trial_params: JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" }) },
        "POST"
      );
      return { id: String(c.id), trial: true };
    } catch (e) {
      // Trial reels not available for this account/API version → normal Reel.
      if (!/trial/i.test(e instanceof Error ? e.message : "")) throw e;
    }
  }
  const c = await graph(`${igUserId()}/media`, token, base, "POST");
  return { id: String(c.id), trial: false };
}

export async function containerStatus(containerId: string, token: string) {
  const d = await graph(containerId, token, { fields: "status_code,status" });
  return { code: String(d.status_code || ""), detail: String(d.status || "") };
}

export async function publishContainer(containerId: string, token: string) {
  const pub = await graph(`${igUserId()}/media_publish`, token, { creation_id: containerId }, "POST");
  const mediaId = String(pub.id);
  let permalink: string | undefined;
  try {
    const m = await graph(mediaId, token, { fields: "permalink" });
    permalink = m.permalink;
  } catch {
    /* not critical */
  }
  return { mediaId, permalink };
}

// ---- which products have been posted ----

export async function savePosted(productId: string, info: PostedInfo) {
  return writeSetting(`${POST_KEY_PREFIX}${productId}`, JSON.stringify(info));
}

export async function listPosted(): Promise<Record<string, PostedInfo>> {
  const rows = await readPrefixed(POST_KEY_PREFIX);
  const out: Record<string, PostedInfo> = {};
  for (const r of rows) {
    try {
      out[r.key.slice(POST_KEY_PREFIX.length)] = JSON.parse(r.value);
    } catch {
      /* skip */
    }
  }
  return out;
}

// ---- photo URLs Instagram can accept ----

const ALLOWED_IMAGE_HOSTS = ["hbmfkrrjxlpamzgozzmh.supabase.co", "www.charmchase.co.uk", "charmchase.co.uk"];

export function absoluteImageUrl(u: string) {
  return u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function isAllowedImageUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/** Instagram accepts aspect ratios from 4:5 (0.8) to 1.91:1. */
export function clampRatio(r: number) {
  if (!isFinite(r) || r <= 0) return 0.8;
  return Math.round(Math.min(1.91, Math.max(0.8, r)) * 1000) / 1000;
}

/** URL of our converter that turns a product photo into an Instagram-safe JPEG. */
export function instagramImageUrl(src: string, ratio: number) {
  return `${SITE_URL}/api/instagram/image?r=${ratio}&u=${encodeURIComponent(absoluteImageUrl(src))}`;
}
