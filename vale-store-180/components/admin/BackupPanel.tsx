"use client";

import { useEffect, useState } from "react";

// Admin → Notifications → Backups (update 113): weekly Google Drive backup.
type Status = {
  drive: { configured: boolean; connected: boolean; connectedAt?: string };
  last: { at: string; name: string; size: number; folderUrl: string; summary: string } | null;
  log: { at: string; kind: string; text: string }[];
};

export default function BackupPanel() {
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/backup");
      if (r.ok) setS(await r.json());
    } catch {
      /* optional */
    }
  }
  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("gdrive") === "connected") setMsg("Google Drive connected ✓ — press “Back up now” to test.");
    if (q.get("gdrive") === "error") setMsg(`Google Drive: ${q.get("msg") || "connection failed"}`);
  }, []);

  async function backupNow() {
    setBusy(true);
    setMsg("Making the backup…");
    try {
      const r = await fetch("/api/admin/backup", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Backup failed");
      setMsg(`Saved ✓ ${j.name} (${Math.round(j.size / 1024)} KB)`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  }

  if (!s) return null;
  return (
    <div className="mt-6 rounded-xl border border-border p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">💾 Weekly backup to Google Drive</p>
          <p className="text-xs text-muted">
            {!s.drive.configured
              ? "Not set up yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing in Vercel)."
              : !s.drive.connected
              ? "Google Drive not connected."
              : s.last
              ? `Last backup ${new Date(s.last.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} · every Sunday after 3:00 (UK)`
              : "Connected ✓ · first backup this Sunday after 3:00 (UK), or press “Back up now”."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.drive.configured && (
            <a href="/api/admin/gdrive/connect" className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:border-ink">
              {s.drive.connected ? "Reconnect Google Drive" : "Connect Google Drive"}
            </a>
          )}
          {s.drive.connected && (
            <button
              onClick={backupNow}
              disabled={busy}
              className="rounded-md bg-ink px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {busy ? "Backing up…" : "Back up now"}
            </button>
          )}
          {s.last?.folderUrl && (
            <a href={s.last.folderUrl} target="_blank" rel="noreferrer" className="px-1 py-1.5 text-xs underline">
              Open folder
            </a>
          )}
        </div>
      </div>
      {s.last && <p className="mt-2 text-xs text-muted">{s.last.summary}</p>}
      {msg && <p className="mt-2">{msg}</p>}
    </div>
  );
}
