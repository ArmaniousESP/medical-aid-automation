'use client';

import { useState } from 'react';
import { useDryRunMode } from './useDryRunMode';
import { WaDryRunSwitch, confirmLiveSend } from './WaDryRunSwitch';

export function ReplayFailedButton() {
  const { dryRun } = useDryRunMode();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    const useDry = dryRun;
    if (!useDry && !confirmLiveSend('replay failed WhatsApp')) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notifications/replay', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: useDry, limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(
        `Found ${data.found} failed · ok ${data.ok_count}` +
          (useDry ? ' (dry run — new log rows only)' : ' (live — originals marked replayed)')
      );
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-sm text-slate-900">Replay failed WhatsApp</h2>
          <p className="text-xs text-slate-600 mt-1">
            Re-sends rows in notification_log with status=failed (uses same retry policy).
          </p>
        </div>
        <WaDryRunSwitch />
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
          dryRun ? 'bg-slate-700' : 'bg-indigo-700 hover:bg-indigo-800'
        }`}
      >
        {loading ? '…' : dryRun ? '▶ Dry-run replay' : '▶ Replay failed (live)'}
      </button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
