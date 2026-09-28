import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Google Drive connection for weekly backups (update 113).
// Env (Vercel): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// Scope drive.file: the site can only see/modify files and folders it created
// itself — nothing else on the Drive. Refresh token lives in app_settings.

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_KEY = "gdrive_refresh";
const FOLDER_KEY = "gdrive_folder";
export const FOLDER_NAME = "CharmChase Backup — weekly (site)";
export const REDIRECT = "https://www.charmchase.co.uk/api/admin/gdrive/callback";

function env(n: string) {
  return (process.env[n] || "").trim();
}

export function gdriveConfigured() {
  return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
}

async function getSetting(key: string) {
  const { data } = await supabaseAdmin().from("app_settings").select("value, updated_at").eq("key", key).maybeSingle();
  return data as { value: string; updated_at: string } | null;
}

async function setSetting(key: string, value: string) {
  const { error } = await supabaseAdmin()
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export function authorizeUrl(state: string) {
  const q = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenCall(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), ...body }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Google: ${data.error_description || data.error || res.status}`);
  return data as { access_token: string; refresh_token?: string };
}

export async function connectWithCode(code: string) {
  const t = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: REDIRECT });
  if (!t.refresh_token) throw new Error("Google didn't return a refresh token — remove access in your Google account and connect again.");
  await setSetting(TOKEN_KEY, t.refresh_token);
}

export async function gdriveStatus() {
  const row = await getSetting(TOKEN_KEY).catch(() => null);
  return { configured: gdriveConfigured(), connected: Boolean(row), connectedAt: row?.updated_at };
}

async function accessToken() {
  const row = await getSetting(TOKEN_KEY);
  if (!row) throw new Error("Google Drive is not connected yet.");
  return (await tokenCall({ grant_type: "refresh_token", refresh_token: row.value })).access_token;
}

async function drive(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Drive ${res.status}: ${t.slice(0, 200)}`);
  }
  return res;
}

/** The site's own backup folder (created on first use). */
async function folderId(token: string) {
  const saved = await getSetting(FOLDER_KEY).catch(() => null);
  if (saved) {
    try {
      const r = await drive(token, `/drive/v3/files/${saved.value}?fields=id,trashed`);
      const f = await r.json();
      if (!f.trashed) return saved.value;
    } catch {
      /* folder gone — make a new one */
    }
  }
  const r = await drive(token, "/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const id = (await r.json()).id as string;
  await setSetting(FOLDER_KEY, id);
  return id;
}

/** Uploads a file into the backup folder and keeps only the newest `keep` backups. */
export async function uploadBackup(name: string, data: Uint8Array, mime: string, keep = 8) {
  const token = await accessToken();
  const parent = await folderId(token);
  const start = await drive(token, "/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Upload-Content-Type": mime },
    body: JSON.stringify({ name, parents: [parent] }),
  });
  const session = start.headers.get("location");
  if (!session) throw new Error("Drive didn't start the upload.");
  const put = await fetch(session, { method: "PUT", headers: { "Content-Type": mime }, body: Buffer.from(data) });
  if (!put.ok) throw new Error(`Drive upload ${put.status}`);
  const file = await put.json();

  // Retention: delete older backups beyond `keep`.
  try {
    const q = encodeURIComponent(`'${parent}' in parents and trashed = false and name contains 'CharmChase-backup-'`);
    const list = await (await drive(token, `/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name)&pageSize=100`)).json();
    for (const f of (list.files || []).slice(keep)) {
      await drive(token, `/drive/v3/files/${f.id}`, { method: "DELETE" }).catch(() => {});
    }
  } catch {
    /* not critical */
  }
  return { id: String(file.id), folderUrl: `https://drive.google.com/drive/folders/${parent}` };
}
