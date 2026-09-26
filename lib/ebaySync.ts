import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  allActiveListings,
  endListing,
  getConnection,
  soldItemIds,
  userAccessToken,
} from "@/lib/ebay";

// Two-way "sold" sync between the site and eBay (update 107).
//  - Sold on eBay  → the same item on the site becomes "sold".
//  - Sold on the site (Stripe, or marked Sold in admin) → the eBay listing is ended.
// Items are matched by products.ebay_item_id. Items that were on the site
// before the eBay import get linked automatically by exact title.
// Every change is written to a small log (app_settings "ebay_sync_log")
// that shows up in Admin → Notifications.

const LOG_KEY = "ebay_sync_log";
const LAST_KEY = "ebay_sync_last";
const MAX_LOG = 60;

export type SyncEvent = {
  at: string;
  kind: "sold_on_ebay" | "ended_on_ebay" | "linked" | "error";
  text: string;
};

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
  try {
    await db()
      .from("app_settings")
      .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
  } catch {
    /* logging must never break a sale */
  }
}

export async function readSyncLog() {
  return readJson<SyncEvent[]>(LOG_KEY, []);
}

export async function lastSync() {
  return readJson<{ at: string; summary: string } | null>(LAST_KEY, null);
}

async function addEvents(events: Omit<SyncEvent, "at">[]) {
  if (!events.length) return;
  const now = new Date().toISOString();
  const log = await readSyncLog();
  const next = [...events.map((e) => ({ ...e, at: now })), ...log].slice(0, MAX_LOG);
  await writeJson(LOG_KEY, next);
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Ends the eBay listings of products that just sold on the site.
 * Called from the Stripe webhook and when a product is marked Sold in admin.
 * Never throws — failures are logged and retried by the next full sync.
 */
export async function endEbayListingsFor(productIds: string[]) {
  if (!productIds.length) return [];
  const results: { id: string; itemId: string; ok: boolean; error?: string }[] = [];
  try {
    const { data } = await db()
      .from("products")
      .select("id, name, ebay_item_id")
      .in("id", productIds)
      .not("ebay_item_id", "is", null);
    const items = (data || []) as { id: string; name: string; ebay_item_id: string }[];
    if (!items.length) return [];

    const conn = await getConnection();
    if (!conn || !conn.canEndListings) {
      await addEvents(
        items.map((p) => ({
          kind: "error" as const,
          text: `End on eBay manually: “${p.name}” (eBay ${p.ebay_item_id}) — ${
            conn ? "press Reconnect eBay in Review drafts to allow automatic ending" : "eBay not connected"
          }`,
        }))
      );
      return items.map((p) => ({ id: p.id, itemId: p.ebay_item_id, ok: false, error: "no write access" }));
    }

    const token = await userAccessToken();
    const events: Omit<SyncEvent, "at">[] = [];
    for (const p of items) {
      const r = await endListing(token, p.ebay_item_id);
      results.push({ id: p.id, itemId: p.ebay_item_id, ok: r.ok, error: r.ok ? undefined : r.error });
      events.push(
        r.ok
          ? { kind: "ended_on_ebay", text: `Sold on site → eBay listing ended: “${p.name}”` }
          : { kind: "error", text: `Could not end eBay listing for “${p.name}”: ${r.error}` }
      );
    }
    await addEvents(events);
  } catch (e) {
    await addEvents([{ kind: "error", text: `eBay: ${e instanceof Error ? e.message : String(e)}` }]);
  }
  return results;
}

/**
 * Full sync. Safe to run as often as you like (every 15 min by Supabase cron,
 * daily by Vercel cron, and from the "Sync with eBay" button).
 */
export async function runEbaySync() {
  const conn = await getConnection();
  if (!conn) return { ok: false, error: "eBay not connected" };

  const token = await userAccessToken();
  const events: Omit<SyncEvent, "at">[] = [];

  // 1) Sold on eBay → mark sold on the site.
  const sold = await soldItemIds(token, 30);
  let markedSold = 0;
  if (sold.size) {
    const { data } = await db()
      .from("products")
      .select("id, name, status, ebay_item_id")
      .in("ebay_item_id", Array.from(sold));
    const toMark = (data || []).filter((p) => p.status !== "sold");
    if (toMark.length) {
      const { error } = await db()
        .from("products")
        .update({ status: "sold" })
        .in(
          "id",
          toMark.map((p) => p.id)
        );
      if (error) events.push({ kind: "error", text: `Could not mark sold: ${error.message}` });
      else {
        markedSold = toMark.length;
        toMark.forEach((p) => events.push({ kind: "sold_on_ebay", text: `Sold on eBay → marked Sold on site: “${p.name}”` }));
      }
    }
  }

  // 2) Active eBay listings: link old site items by title, and end listings
  //    whose item is already sold on the site (catches anything missed).
  const active = await allActiveListings(token);
  const activeIds = new Set(active.map((a) => a.itemId));

  const { data: products } = await db().from("products").select("id, name, status, ebay_item_id");
  const all = (products || []) as { id: string; name: string; status: string | null; ebay_item_id: string | null }[];

  let linked = 0;
  const knownIds = new Set(all.map((p) => p.ebay_item_id).filter(Boolean) as string[]);
  // Only items still for sale get linked — an old sold item with the same
  // title must never cause a new eBay listing to be ended.
  const unlinked = all.filter((p) => !p.ebay_item_id && p.status !== "sold");
  const byName = new Map<string, typeof unlinked>();
  for (const p of unlinked) {
    const k = norm(p.name || "");
    if (!k) continue;
    byName.set(k, [...(byName.get(k) || []), p]);
  }
  for (const a of active) {
    if (knownIds.has(a.itemId)) continue;
    const matches = byName.get(norm(a.title));
    if (matches && matches.length === 1) {
      const p = matches[0];
      const { error } = await db().from("products").update({ ebay_item_id: a.itemId }).eq("id", p.id);
      if (!error) {
        p.ebay_item_id = a.itemId;
        knownIds.add(a.itemId);
        linked++;
        events.push({ kind: "linked", text: `Linked to eBay listing: “${p.name}”` });
      }
    }
  }

  const soldHereStillLive = all.filter((p) => p.status === "sold" && p.ebay_item_id && activeIds.has(p.ebay_item_id));
  await addEvents(events);
  let ended = 0;
  if (soldHereStillLive.length) {
    const r = await endEbayListingsFor(soldHereStillLive.map((p) => p.id));
    ended = r.filter((x) => x.ok).length;
  }

  const summary = `${markedSold} sold on eBay · ${ended} ended on eBay · ${linked} linked · ${active.length} live on eBay`;
  await writeJson(LAST_KEY, { at: new Date().toISOString(), summary });
  return { ok: true, markedSold, ended, linked, active: active.length, canEndListings: conn.canEndListings, summary };
}
