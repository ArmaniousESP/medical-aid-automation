'use client';

import { useState } from 'react';

export function ReplayFailedButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(dry_run: boolean) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notifications/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run, limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(
        `Found ${data.found} failed · ok ${data.ok_count}` +
          (dry_run ? ' (dry run — new log rows only)' : ' (originals marked replayed)')
      );
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <h2 className="font-medium text-sm">Replay failed WhatsApp</h2>
      <p className="text-xs text-slate-600">
        Re-sends rows in notification_log with status=failed (uses same retry policy).
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true)}
          className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Dry run replay
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(false)}
          className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Replay failed
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
