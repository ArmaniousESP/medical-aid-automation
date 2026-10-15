'use client';

import { useState } from 'react';
import { useDryRunMode } from './useDryRunMode';
import { WaDryRunSwitch, confirmLiveSend } from './WaDryRunSwitch';

export function RenewalCampaignButton() {
  const { dryRun } = useDryRunMode();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const useDry = dryRun;
    if (!useDry && !confirmLiveSend('2027 renewal WhatsApp campaign')) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const secret =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('maa_process_secret') ||
            localStorage.getItem('maa_process_secret') ||
            ''
          : '';
      const res = await fetch('/api/employee/regimens/campaign', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-process-secret': secret } : {}),
        },
        body: JSON.stringify({ dry_run: useDry, limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(
        `${useDry ? 'DRY-RUN' : 'LIVE'} · attempted ${data.attempted} · ok ${data.ok_count} · deadline ${data.deadline}` +
          (data.results?.[0]?.message_preview
            ? `\n\nSample:\n${data.results[0].message_preview}…`
            : '')
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">2027 renewal WhatsApp</h3>
          <p className="text-xs text-slate-600 mt-1">
            Remind employees with 2026 regimens to open My profile and renew by 10 Dec 2026.
          </p>
          <p className="text-xs text-slate-500" dir="rtl">
            تذكير بتجديد دعم 2027 عبر واتساب.
          </p>
        </div>
        <WaDryRunSwitch />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
          dryRun ? 'bg-violet-700 hover:bg-violet-800' : 'bg-amber-700 hover:bg-amber-800'
        }`}
      >
        {busy ? 'Running…' : dryRun ? '▶ Dry-run campaign' : '▶ Live campaign'}
      </button>
      {result && (
        <pre className="text-[11px] whitespace-pre-wrap rounded-lg bg-white/80 border border-violet-100 p-3 text-slate-700">
          {result}
        </pre>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
