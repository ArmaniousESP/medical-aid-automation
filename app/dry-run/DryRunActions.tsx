'use client';

import { useState } from 'react';

export function DryRunActions({ period }: { period: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);

  async function runDue() {
    setLoading('due');
    setLog(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify_due',
          dry_run: true,
          period,
          limit: 20,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLog(
        `Due dry-run: ${data.ok_count ?? 0}/${data.attempted ?? 0} · provider=${data.provider || '?'} · period=${data.period || period}`
      );
    } catch (e: unknown) {
      setLog(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  async function runSafety() {
    setLoading('safety');
    setLog(null);
    try {
      const res = await fetch('/api/notifications/safety-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLog(
        data.skipped
          ? `Safety skipped: ${data.reason || 'n/a'} · flagged=${data.flagged ?? 0}`
          : `Safety dry-run: ok=${data.ok_count ?? 0} · flagged=${data.flagged ?? 0}`
      );
    } catch (e: unknown) {
      setLog(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <p className="text-sm font-semibold text-amber-950">
        Safe actions (always dry-run)
      </p>
      <p className="text-xs text-amber-900">
        No live WhatsApp is sent from these buttons. Messages are logged only.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!loading}
          onClick={runDue}
          className="rounded bg-amber-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {loading === 'due' ? '…' : `Dry-run notify due · ${period}`}
        </button>
        <button
          type="button"
          disabled={!!loading}
          onClick={runSafety}
          className="rounded border border-amber-800 px-3 py-1.5 text-sm text-amber-950 disabled:opacity-50"
        >
          {loading === 'safety' ? '…' : 'Dry-run safety alert'}
        </button>
      </div>
      {log && (
        <p className="text-xs text-slate-700 break-all font-mono" dir="auto">
          {log}
        </p>
      )}
    </div>
  );
}
