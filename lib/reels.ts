import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildInstagramCaption } from "@/lib/instagramCaption";
import {
  absoluteImageUrl,
  containerStatus,
  createReelContainer,
  getToken,
  isAllowedImageUrl,
  isConfigured,
  publishContainer,
} from "@/lib/instagram";
import { buildClipReel, buildReel, type ReelScript, type SoundMode } from "@/lib/reelVideo";

// Daily automatic Instagram Reel (update 109).
// Every day after the chosen hour (UK time) the site picks an item for sale
// that hasn't had a Reel yet, builds a short video from its photos with one of
// the uploaded music tracks, and publishes it as a *trial reel* (shown to
// non-followers first; Instagram shares it to followers if it does well).
// Driven by /api/instagram/reels/tick (Supabase cron every 15 min).

// Own public bucket for videos + music (created automatically on first use),
// so image-only limits on "product-images" can never block an upload.
const BUCKET = "media";
const MUSIC_DIR = "music";
const SETTINGS_KEY = "reels_settings";
const PENDING_KEY = "reels_pending";
const LAST_DAY_KEY = "reels_last_day";
const LOG_KEY = "reels_log";
const REEL_PREFIX = "reel:";

// Things we don't post on Instagram (Recovery Kit rules: ivory, tortoiseshell,
// taxidermy, weapons incl. knives/swords, tobacco, alcohol). Wine coasters,
// decanters, snuff boxes etc. are fine.
const BLOCKED = /\b(ivory|tortoise ?shell|taxiderm\w*|stuffed|rhino|whalebone|knife|knives|sword|swords|dagger|bayonet|machete|gun|guns|pistol|rifle|revolver|ammunition|tobacco|alcohol)\b/i;

export type ReelSettings = { enabled: boolean; hour: number; trial: boolean };
export type ReelEvent = { at: string; kind: "posted" | "error" | "info"; text: string; link?: string };
type Pending = {
  containerId: string;
  productId: string;
  name: string;
  video: string;
  createdAt: string;
  trial: boolean;
  fromClip?: boolean;
};

// Your own video for an item (update 111): uploaded in Items → 🎥 Video.
const CLIP_PREFIX = "reel_video:";
export type ClipRecord = {
  path: string; // original upload in the media bucket
  sound: SoundMode;
  uploadedAt: string;
  built?: { videoPath: string; coverPath: string; seconds: number; at: string; script?: ReelScript };
  posted?: { at: string; permalink?: string };
};

// Off by default: Artem chooses which items get a Reel (update 111).
const DEFAULTS: ReelSettings = { enabled: false, hour: 18, trial: true };

function db() {
  return supabaseAdmin();
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
    return data ? (JSON.parse(data.value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown) {
  await db()
    .from("app_settings")
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
}

async function remove(key: string) {
  await db().from("app_settings").delete().eq("key", key);
}

export async function getSettings() {
  return { ...DEFAULTS, ...(await read<Partial<ReelSettings>>(SETTINGS_KEY, {})) };
}

export async function saveSettings(s: Partial<ReelSettings>) {
  const next = { ...(await getSettings()), ...s };
  next.hour = Math.min(22, Math.max(7, Math.round(Number(next.hour) || 18)));
  await write(SETTINGS_KEY, next);
  return next;
}

export async function readLog() {
  return read<ReelEvent[]>(LOG_KEY, []);
}

async function log(e: Omit<ReelEvent, "at">) {
  const list = await readLog();
  await write(LOG_KEY, [{ ...e, at: new Date().toISOString() }, ...list].slice(0, 60));
}

export async function getPending() {
  return read<Pending | null>(PENDING_KEY, null);
}

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await db().storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await db().storage.createBucket(BUCKET, { public: true, fileSizeLimit: "50MB" });
    if (error && !/exists/i.test(error.message)) throw new Error(`storage: ${error.message}`);
  }
  bucketReady = true;
}

// ---------- music ----------

export async function listMusic() {
  await ensureBucket();
  const { data } = await db().storage.from(BUCKET).list(MUSIC_DIR, { limit: 100 });
  return (data || [])
    .filter((f) => /\.(mp3|m4a|aac|wav)$/i.test(f.name))
    .map((f) => ({ name: f.name, url: db().storage.from(BUCKET).getPublicUrl(`${MUSIC_DIR}/${f.name}`).data.publicUrl }));
}

export async function musicUploadUrl(filename: string) {
  await ensureBucket();
  const clean = filename.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").slice(-80);
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(`${MUSIC_DIR}/${Date.now()}-${clean}`);
  if (error || !data) throw new Error(error?.message || "Could not prepare upload.");
  return data.signedUrl;
}

export async function deleteMusic(name: string) {
  await db().storage.from(BUCKET).remove([`${MUSIC_DIR}/${name.replace(/\//g, "")}`]);
}

// ---------- choosing an item ----------

type Candidate = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: "furniture" | "jewelry" | "decor" | "art";
  subcategory: string | null;
  era: string | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  images: string[] | null;
  image: string | null;
  created_at: string;
};

function photosOf(p: Candidate) {
  return (p.images && p.images.length ? p.images : p.image ? [p.image] : [])
    .map((u) => absoluteImageUrl(u))
    .filter(isAllowedImageUrl);
}

export async function nextCandidate(productId?: string) {
  const { data } = await db()
    .from("products")
    .select("id, name, description, price, category, subcategory, era, length_cm, width_cm, height_cm, images, image, created_at, status, is_draft");
  const all = ((data || []) as (Candidate & { status: string | null; is_draft: boolean | null })[]).filter(
    (p) => (!p.status || p.status === "available") && !p.is_draft && photosOf(p).length > 0
  );
  if (productId) return all.find((p) => p.id === productId) || null;

  const ok = all.filter((p) => !BLOCKED.test(`${p.name} ${p.description || ""}`));

  // Your own videos go first (oldest upload first).
  const clips = await listClips();
  const withClip = ok
    .filter((p) => clips[p.id] && !clips[p.id].posted)
    .sort((a, b) => clips[a.id].uploadedAt.localeCompare(clips[b.id].uploadedAt));
  if (withClip.length) return withClip[0];
  const { data: done } = await db().from("app_settings").select("key, updated_at").like("key", `${REEL_PREFIX}%`);
  const lastReel = new Map((done || []).map((r) => [String(r.key).slice(REEL_PREFIX.length), String(r.updated_at)]));

  // Never-reeled items first (newest first, more photos first); then the one reeled longest ago.
  const fresh = ok
    .filter((p) => !lastReel.has(p.id))
    .sort(
      (a, b) =>
        Math.min(photosOf(b).length, 3) - Math.min(photosOf(a).length, 3) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  if (fresh.length) return fresh[0];
  return ok.sort((a, b) => (lastReel.get(a.id) || "").localeCompare(lastReel.get(b.id) || ""))[0] || null;
}

// ---------- words on screen (hook + 3 facts) ----------

const EBAY_NOISE = /(bidding|before buying|message me|any questions|please (see|check|study|examine)|photos? (closely|carefully)|part of the (listing|description))/i;

/** Simple rules — used when no AI key is set or the AI call fails. */
function ruleScript(p: Candidate): ReelScript {
  const text = `${p.name} ${p.description || ""}`;
  const yearM = p.name.match(/\b(?:c\.?\s?)?(1[5-9]\d\d)\b/i);
  const year = yearM ? Number(yearM[1]) : 0;
  const hook =
    year && year < 1960
      ? `Made around ${year}. Still beautiful today.`
      : /antique/i.test(text)
      ? "A genuine antique. Only one available."
      : "One of a kind. Only one available.";
  const facts: string[] = [];
  const desc = p.description || "";
  // Prefer bullet points ("• Metal: 18ct gold") — they're the selling facts.
  const parts = desc.includes("•") ? desc.split("•").slice(1) : desc.split(/\n/);
  for (const raw of parts) {
    const line = raw.replace(/^[\s\-–*]+/, "").replace(/\s+/g, " ").trim();
    if (!line || EBAY_NOISE.test(line)) continue;
    let short = line.replace(/^[A-Z][a-z ]{2,20}:\s*/, ""); // "Metal: 18ct gold" → "18ct gold"
    if (short.length > 40) short = short.split(/[,(;]| – | ⸻/)[0].trim();
    if (short.length >= 6 && short.length <= 40) facts.push(short);
    if (facts.length === 3) break;
  }
  if (p.era && facts.length < 3) facts.push(`${p.era} era`);
  if (facts.length < 3) facts.push("Only one available");
  return { hook, facts: facts.slice(0, 3) };
}

/**
 * AI-written hook + facts (Claude, if ANTHROPIC_API_KEY is set in Vercel).
 * Strictly from the listing text — never invents age, maker or materials.
 */
async function aiScript(p: Candidate): Promise<ReelScript | null> {
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return null;
  const model = (process.env.REELS_AI_MODEL || "claude-haiku-4-5").trim();
  const prompt = `You write on-screen text for a 15-second Instagram Reel selling ONE item from CharmChase, an antiques & vintage shop in Evesham, UK.

Item: ${p.name}
Price: £${(p.price / 100).toFixed(0)}
Listing text:
${(p.description || "").slice(0, 2500)}

Return JSON only: {"hook": "...", "facts": ["...", "...", "..."]}
- hook: max 9 words, British English, makes a scroller stop (curiosity, story, age, craftsmanship). No price, no emojis, no hashtags, no "link in bio".
- facts: exactly 3, max 6 words each, concrete selling points taken ONLY from the listing (material, age, maker, size, condition, what it does).
- Never invent anything not stated in the listing (no guessed dates, makers, provenance or stone counts). If unsure, leave it out.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json().catch(() => ({}));
    const text: string = data?.content?.[0]?.text || "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const hook = String(json.hook || "").trim();
    const facts = (Array.isArray(json.facts) ? json.facts : []).map((f: unknown) => String(f).trim()).filter(Boolean);
    if (!hook || facts.length < 2) return null;
    return { hook: hook.slice(0, 80), facts: facts.slice(0, 3).map((f: string) => f.slice(0, 44)) };
  } catch {
    return null;
  }
}

async function scriptFor(p: Candidate) {
  return (await aiScript(p)) || ruleScript(p);
}

// ---------- building + publishing ----------

async function fetchBytes(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------- your own clips ----------

export async function listClips() {
  const out: Record<string, ClipRecord> = {};
  try {
    const { data } = await db().from("app_settings").select("key, value").like("key", `${CLIP_PREFIX}%`);
    for (const r of data || []) {
      try {
        out[String(r.key).slice(CLIP_PREFIX.length)] = JSON.parse(r.value);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* table missing */
  }
  return out;
}

async function getClip(productId: string) {
  return read<ClipRecord | null>(`${CLIP_PREFIX}${productId}`, null);
}

export async function clipUploadUrl(productId: string, filename: string) {
  await ensureBucket();
  const ext = (filename.toLowerCase().match(/\.(mp4|mov|m4v|webm)$/) || [".mp4"])[0];
  const path = `videos/${productId}-${Date.now()}${ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message || "Could not prepare upload.");
  return { url: data.signedUrl, path };
}

async function removeFiles(paths: (string | undefined)[]) {
  const list = paths.filter(Boolean) as string[];
  if (list.length) await db().storage.from(BUCKET).remove(list).catch(() => {});
}

export async function saveClip(productId: string, path: string, sound: SoundMode) {
  const old = await getClip(productId);
  if (old && old.path !== path) await removeFiles([old.path, old.built?.videoPath, old.built?.coverPath]);
  const rec: ClipRecord = { path, sound, uploadedAt: new Date().toISOString() };
  await write(`${CLIP_PREFIX}${productId}`, rec);
  return rec;
}

export async function setClipSound(productId: string, sound: SoundMode) {
  const rec = await getClip(productId);
  if (!rec) throw new Error("No video for this item.");
  await removeFiles([rec.built?.videoPath, rec.built?.coverPath]);
  const next: ClipRecord = { ...rec, sound, built: undefined };
  await write(`${CLIP_PREFIX}${productId}`, next);
  return next;
}

export async function deleteClip(productId: string) {
  const rec = await getClip(productId);
  if (rec) await removeFiles([rec.path, rec.built?.videoPath, rec.built?.coverPath]);
  await remove(`${CLIP_PREFIX}${productId}`);
}

export function publicUrl(path: string) {
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function candidateById(productId: string) {
  const { data } = await db()
    .from("products")
    .select("id, name, description, price, category, subcategory, era, length_cm, width_cm, height_cm, images, image, created_at")
    .eq("id", productId)
    .maybeSingle();
  return (data as Candidate | null) || null;
}

/** Builds (or reuses) the finished Reel from the item's own video. */
async function makeClipVideo(p: Candidate, rec: ClipRecord, rebuild = false) {
  if (rec.built && !rebuild) {
    return {
      videoPath: rec.built.videoPath,
      videoUrl: publicUrl(rec.built.videoPath),
      coverUrl: publicUrl(rec.built.coverPath),
      seconds: rec.built.seconds,
      track: null as string | null,
      script: rec.built.script,
    };
  }
  const clip = await fetchBytes(publicUrl(rec.path));
  const firstPhoto = photosOf(p)[0];
  const photo = firstPhoto ? await fetchBytes(firstPhoto).catch(() => null) : null;
  const tracks = rec.sound === "original" ? [] : await listMusic();
  const track = tracks.length ? tracks[Math.floor(Math.random() * tracks.length)] : null;
  const music = track ? await fetchBytes(track.url).catch(() => null) : null;
  const script = await scriptFor(p);
  const reel = await buildClipReel({ name: p.name, pricePence: p.price, era: p.era }, clip, photo, {
    script,
    music,
    sound: rec.sound,
  });
  const stamp = Date.now();
  const store = db().storage.from(BUCKET);
  const videoPath = `reels/${p.id}-clip-${stamp}.mp4`;
  const coverPath = `reels/${p.id}-clip-${stamp}.jpg`;
  const up = await store.upload(videoPath, reel.video, { contentType: "video/mp4", upsert: true });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  await store.upload(coverPath, reel.cover, { contentType: "image/jpeg", upsert: true });
  await removeFiles([rec.built?.videoPath, rec.built?.coverPath]);
  const built = { videoPath, coverPath, seconds: reel.seconds, at: new Date().toISOString(), script };
  await write(`${CLIP_PREFIX}${p.id}`, { ...rec, built });
  return {
    videoPath,
    videoUrl: publicUrl(videoPath),
    coverUrl: publicUrl(coverPath),
    seconds: reel.seconds,
    track: track?.name || null,
    script,
  };
}

/** Admin "Preview" for an item's own video — builds it fresh. */
export async function previewClipReel(productId: string) {
  const p = await candidateById(productId);
  if (!p) throw new Error("Item not found.");
  const rec = await getClip(productId);
  if (!rec) throw new Error("Upload a video for this item first.");
  const v = await makeClipVideo(p, rec, true);
  return { productId: p.id, name: p.name, ...v };
}

async function makeVideo(p: Candidate) {
  const rec = await getClip(p.id);
  if (rec && !rec.posted) return { ...(await makeClipVideo(p, rec)), fromClip: true };
  const photos: Buffer[] = [];
  for (const u of photosOf(p).slice(0, 5)) {
    try {
      photos.push(await fetchBytes(u));
    } catch {
      /* skip a broken photo */
    }
  }
  if (!photos.length) throw new Error("Couldn't download the photos.");
  const tracks = await listMusic();
  const track = tracks.length ? tracks[Math.floor(Math.random() * tracks.length)] : null;
  const music = track ? await fetchBytes(track.url).catch(() => null) : null;

  const script = await scriptFor(p);
  const reel = await buildReel({ name: p.name, pricePence: p.price, era: p.era }, photos, music, script);

  await ensureBucket();
  const stamp = Date.now();
  const store = db().storage.from(BUCKET);
  const videoPath = `reels/${p.id}-${stamp}.mp4`;
  const coverPath = `reels/${p.id}-${stamp}.jpg`;
  const up1 = await store.upload(videoPath, reel.video, { contentType: "video/mp4", upsert: true });
  if (up1.error) throw new Error(`upload: ${up1.error.message}`);
  await store.upload(coverPath, reel.cover, { contentType: "image/jpeg", upsert: true });
  return {
    videoPath,
    videoUrl: store.getPublicUrl(videoPath).data.publicUrl,
    coverUrl: store.getPublicUrl(coverPath).data.publicUrl,
    seconds: reel.seconds,
    track: track?.name || null,
    script,
    fromClip: false,
  };
}

/** Builds a Reel for the next (or given) item without publishing it. */
export async function previewReel(productId?: string) {
  const p = await nextCandidate(productId);
  if (!p) throw new Error("No item available for a Reel.");
  const v = await makeVideo(p);
  return { productId: p.id, name: p.name, ...v };
}

function londonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((x) => x.type === t)?.value || "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Publishes a pending container if Instagram has finished processing it. */
async function finishPending(pending: Pending, token: string, waitMs: number) {
  const until = Date.now() + waitMs;
  for (;;) {
    const st = await containerStatus(pending.containerId, token);
    if (st.code === "FINISHED") {
      const pub = await publishContainer(pending.containerId, token);
      await write(`${REEL_PREFIX}${pending.productId}`, { mediaId: pub.mediaId, permalink: pub.permalink, at: new Date().toISOString(), trial: pending.trial });
      await remove(PENDING_KEY);
      if (pending.fromClip) {
        const rec = await getClip(pending.productId);
        if (rec) await write(`${CLIP_PREFIX}${pending.productId}`, { ...rec, posted: { at: new Date().toISOString(), permalink: pub.permalink } });
      }
      await log({
        kind: "posted",
        text: `${pending.fromClip ? "Your video" : "Reel"} posted${pending.trial ? " (trial — shown to non-followers first)" : ""}: “${pending.name}”`,
        link: pub.permalink,
      });
      return { status: "posted" as const, permalink: pub.permalink };
    }
    if (st.code === "ERROR" || st.code === "EXPIRED") {
      await remove(PENDING_KEY);
      await log({ kind: "error", text: `Instagram couldn't process the Reel for “${pending.name}”: ${st.detail || st.code}` });
      return { status: "failed" as const };
    }
    if (Date.now() - new Date(pending.createdAt).getTime() > 60 * 60 * 1000) {
      await remove(PENDING_KEY);
      await log({ kind: "error", text: `Reel for “${pending.name}” was still processing after an hour — skipped.` });
      return { status: "failed" as const };
    }
    if (Date.now() + 4000 > until) return { status: "processing" as const };
    await sleep(4000);
  }
}

/**
 * One scheduler step. `force` posts now regardless of the time/day
 * ("Post a Reel now" button); `productId` picks the item.
 */
export async function reelTick(opts: { force?: boolean; productId?: string } = {}) {
  const started = Date.now();
  if (!isConfigured()) return { status: "skipped", reason: "Instagram not connected" };
  const t = await getToken();

  const pending = await getPending();
  if (pending) return finishPending(pending, t.token, 40_000);

  const settings = await getSettings();
  const now = londonNow();
  if (!opts.force) {
    if (!settings.enabled) return { status: "skipped", reason: "turned off" };
    if (now.hour < settings.hour) return { status: "skipped", reason: `waiting for ${settings.hour}:00 UK time` };
    if ((await read<string>(LAST_DAY_KEY, "")) === now.day) return { status: "skipped", reason: "already posted today" };
  }

  const p = await nextCandidate(opts.productId);
  if (!p) {
    if (!opts.force) await write(LAST_DAY_KEY, now.day);
    return { status: "skipped", reason: "no item available" };
  }
  // Photo Reels need music; your own videos can go out with their own sound.
  if (!opts.force && !(await getClip(p.id)) && !(await listMusic()).length)
    return { status: "skipped", reason: "waiting for music — upload a track in Items → Daily Reel" };

  // Mark the day first so a failure never causes repeated posts.
  if (!opts.force) await write(LAST_DAY_KEY, now.day);
  try {
    const v = await makeVideo(p);
    const caption = buildInstagramCaption({
      name: p.name,
      description: p.description || undefined,
      price: p.price,
      category: p.category,
      subcategory: p.subcategory || undefined,
      era: p.era || undefined,
      length_cm: p.length_cm || undefined,
      width_cm: p.width_cm || undefined,
      height_cm: p.height_cm || undefined,
    });
    const c = await createReelContainer(v.videoUrl, caption, t.token, { coverUrl: v.coverUrl, trial: settings.trial });
    const next: Pending = {
      containerId: c.id,
      productId: p.id,
      name: p.name,
      video: v.videoPath,
      createdAt: new Date().toISOString(),
      trial: c.trial,
      fromClip: v.fromClip,
    };
    await write(PENDING_KEY, next);
    const left = 55_000 - (Date.now() - started);
    return finishPending(next, t.token, Math.max(0, left));
  } catch (e) {
    await log({ kind: "error", text: `Daily Reel failed for “${p.name}”: ${e instanceof Error ? e.message : String(e)}` });
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Items that already had a Reel posted (photos or own video). */
export async function listReeled() {
  try {
    const { data } = await db().from("app_settings").select("key").like("key", `${REEL_PREFIX}%`);
    return (data || []).map((r) => String(r.key).slice(REEL_PREFIX.length));
  } catch {
    return [];
  }
}
