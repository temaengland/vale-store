"use client";

import { useState } from "react";

type Move = { id: string; name: string; from: string; to: string };

// Update 121: preview and apply the move into the six categories.
export default function ReorganisePanel() {
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function check() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/reorganise");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setMoves(d.moves || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!confirm(`Move ${moves?.length || 0} items into their new categories?`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/reorganise", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setMsg(`Done ✓ ${d.done} of ${d.total} items moved.`);
      setMoves(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-border p-4 text-sm">
      <p className="font-medium">🗂 Six categories — move existing items</p>
      <p className="mt-1 text-xs text-muted">
        Watches &amp; clocks → Watches &amp; Clocks, silverware → Silver, old Decor → Ceramics &amp; Glass or Art &amp; Decor. Check first — nothing
        changes until you press Apply.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={check} disabled={busy} className="rounded-md border border-border-strong px-3 py-1.5 disabled:opacity-50">
          {busy && !moves ? "Checking…" : "Check"}
        </button>
        {moves && moves.length > 0 && (
          <button onClick={apply} disabled={busy} className="rounded-md bg-ink px-3 py-1.5 text-white disabled:opacity-50">
            Apply ({moves.length})
          </button>
        )}
      </div>
      {moves && moves.length === 0 && <p className="mt-3 text-green-700">Nothing to move — everything is already in place ✓</p>}
      {moves && moves.length > 0 && (
        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-xs">
          {moves.map((m) => (
            <li key={m.id} className="border-b border-border pb-1">
              <span className="text-ink">{m.name}</span>
              <br />
              <span className="text-muted">
                {m.from} → <b className="text-ink">{m.to}</b>
              </span>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-3">{msg}</p>}
    </div>
  );
}
