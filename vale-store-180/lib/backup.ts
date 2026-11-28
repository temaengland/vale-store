import "server-only";
import { strToU8, zipSync } from "fflate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gdriveStatus, uploadBackup } from "@/lib/gdrive";

// Weekly backup to Google Drive (update 113): one zip with every table as
// JSON (+ CSV of items and orders for Excel), a list of all photo/video/music
// files with links, and a short restore guide. Secrets are left out.

const LAST_KEY = "backup_last";
const LOG_KEY = "backup_log";

const TABLES = [
  "products",
  "orders",
  "inquiries",
  "notify_requests",
  "product_translations",
  "category_mapping",
  "category_views",
  "app_settings",
];

// app_settings rows that hold access keys — never copied into a backup.
const SECRET_KEY = /token|refresh|secret|password|gdrive|oauth/i;

function db() {
  return supabaseAdmin();
}

async function allRows(table: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from(table).select("*").range(from, from + 999);
    if (error) {
      if (/does not exist|not find/i.test(error.message)) return null; // optional table
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...((data || []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

async function listFiles(bucket: string, prefix = ""): Promise<{ path: string; size: number; url: string }[]> {
  const out: { path: string; size: number; url: string }[] = [];
  const store = db().storage.from(bucket);
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await store.list(prefix, { limit: 1000, offset });
    if (error || !data) break;
    for (const f of data) {
      const p = prefix ? `${prefix}/${f.name}` : f.name;
      if (!f.id) {
        out.push(...(await listFiles(bucket, p))); // folder
      } else {
        out.push({ path: `${bucket}/${p}`, size: Number(f.metadata?.size || 0), url: store.getPublicUrl(p).data.publicUrl });
      }
    }
    if (data.length < 1000) break;
  }
  return out;
}

const README = (date: string, counts: string) => `CharmChase — weekly backup ${date}

What's inside
${counts}
- files.csv — every photo, video and music file in storage, with its link
- *.json — each database table exactly as it is (open in any text editor)
- products.csv / orders.csv — the same items and orders for Excel

Not inside (on purpose)
- Passwords and API keys (see the Recovery Kit: where to get each one again)
- The photos themselves (they stay in Supabase; links are in files.csv)
- The website code (GitHub temaengland/vale-store + vale-store-NN in Downloads)

To restore
1. Supabase → Table Editor → the table → Insert → Import data from CSV/JSON,
   or ask Claude to load these JSON files back into Supabase.
2. Follow "Восстановление с нуля" in the CharmChase Recovery Kit.
`;

export async function runBackup() {
  const date = new Date().toISOString().slice(0, 10);
  const files: Record<string, Uint8Array> = {};
  const counts: string[] = [];

  for (const t of TABLES) {
    let rows = await allRows(t);
    if (rows === null) continue;
    if (t === "app_settings") rows = rows.filter((r) => !SECRET_KEY.test(String(r.key)));
    files[`${t}.json`] = strToU8(JSON.stringify(rows, null, 2));
    if (t === "products" || t === "orders") files[`${t}.csv`] = strToU8(csv(rows));
    counts.push(`- ${t}: ${rows.length}`);
  }

  const media = [...(await listFiles("product-images")), ...(await listFiles("media").catch(() => []))];
  files["files.csv"] = strToU8(csv(media));
  counts.push(`- files in storage: ${media.length}`);
  files["README.txt"] = strToU8(README(date, counts.join("\n")));

  const zip = zipSync(files, { level: 9 });
  const name = `CharmChase-backup-${date}.zip`;
  const up = await uploadBackup(name, zip, "application/zip");
  const info = { at: new Date().toISOString(), name, size: zip.length, folderUrl: up.folderUrl, summary: counts.join(", ").replace(/- /g, "") };
  await db().from("app_settings").upsert({ key: LAST_KEY, value: JSON.stringify(info), updated_at: info.at });
  await addLog({ kind: "ok", text: `Backup saved to Google Drive: ${name} (${Math.round(zip.length / 1024)} KB)` });
  return info;
}

type BackupEvent = { at: string; kind: "ok" | "error"; text: string };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
    return data ? (JSON.parse(data.value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function addLog(e: Omit<BackupEvent, "at">) {
  const list = await readJson<BackupEvent[]>(LOG_KEY, []);
  await db()
    .from("app_settings")
    .upsert({ key: LOG_KEY, value: JSON.stringify([{ ...e, at: new Date().toISOString() }, ...list].slice(0, 30)), updated_at: new Date().toISOString() });
}

export async function readBackupLog() {
  return readJson<BackupEvent[]>(LOG_KEY, []);
}

export async function lastBackup() {
  return readJson<{ at: string; name: string; size: number; folderUrl: string; summary: string } | null>(LAST_KEY, null);
}

/**
 * Called by the 15-minute Supabase job: runs the backup on Sunday after 3:00
 * (UK time) if this week's hasn't been made yet. Failures are logged and retried
 * at the next check (at most once an hour).
 */
export async function maybeWeeklyBackup() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (weekday !== "Sun" || hour < 3) return { status: "not due" };
  if (!(await gdriveStatus().catch(() => ({ connected: false }))).connected) return { status: "drive not connected" };

  const last = await lastBackup();
  if (last && Date.now() - new Date(last.at).getTime() < 3 * 24 * 3600 * 1000) return { status: "done this week" };
  const tried = await readJson<string>("backup_last_try", "");
  if (tried && Date.now() - new Date(tried).getTime() < 3600 * 1000) return { status: "retry later" };
  await db().from("app_settings").upsert({ key: "backup_last_try", value: JSON.stringify(new Date().toISOString()), updated_at: new Date().toISOString() });

  try {
    return { status: "saved", ...(await runBackup()) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await addLog({ kind: "error", text: `Weekly backup failed: ${msg}` });
    return { status: "failed", error: msg };
  }
}
