'use client';

import { useState } from 'react';

export function RenewalCampaignButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(live: boolean) {
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
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-process-secret': secret } : {}),
        },
        body: JSON.stringify({ dry_run: !live, limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(
        `${live ? 'LIVE' : 'DRY-RUN'} · attempted ${data.attempted} · ok ${data.ok_count} · deadline ${data.deadline}` +
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
      <div>
        <h3 className="font-semibold text-slate-900">2027 renewal WhatsApp</h3>
        <p className="text-xs text-slate-600 mt-1">
          Remind employees with 2026 regimens to open My profile and renew by 10 Dec 2026.
          Always dry-run first.
        </p>
        <p className="text-xs text-slate-500" dir="rtl">
          تذكير بتجديد دعم 2027 عبر واتساب — جرّب dry-run أولاً.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(false)}
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Dry-run campaign'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              typeof window !== 'undefined' &&
              window.confirm('Send LIVE WhatsApp to up to 30 pending renewals?')
            ) {
              void run(true);
            }
          }}
          className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
        >
          Live (confirm)
        </button>
      </div>
      {result && (
        <pre className="text-[11px] whitespace-pre-wrap rounded-lg bg-white/80 border border-violet-100 p-3 text-slate-700">
          {result}
        </pre>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
