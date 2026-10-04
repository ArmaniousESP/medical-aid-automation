'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DryRunModeToggle } from './DryRunModeToggle';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * One-click WhatsApp “notify due” with dry_run=true.
 * Safe: never sends live messages from this control.
 */
export function LiveDryRunButton({
  variant = 'primary',
  showScriptLink = true,
  showToggle = true,
}: {
  variant?: 'primary' | 'compact';
  showScriptLink?: boolean;
  showToggle?: boolean;
}) {
  const period = currentPeriod();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify_due',
          dry_run: true,
          period,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dry-run failed');
      setResult(
        [
          'Dry-run OK',
          `${data.ok_count ?? 0}/${data.attempted ?? 0} recipients`,
          data.provider ? `provider=${data.provider}` : null,
          `period=${data.period || period}`,
        ]
          .filter(Boolean)
          .join(' · ')
      );
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {showToggle && <DryRunModeToggle compact />}
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-50"
        >
          {loading ? 'Running…' : '▶ Live dry-run'}
        </button>
        {result && (
          <p className="text-[10px] text-slate-600 break-all font-mono">{result}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showToggle && <DryRunModeToggle />}
      <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Safe practice
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Live dry-run</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Simulates refill-due WhatsApp for <strong>{period}</strong> — this
              button always forces dry-run.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="w-full sm:w-auto rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Running dry-run…' : '▶ Run live dry-run'}
        </button>
        {result && (
          <p
            className={`text-xs font-mono break-all ${
              result.startsWith('Dry-run OK') ? 'text-emerald-800' : 'text-red-700'
            }`}
          >
            {result}
          </p>
        )}
        {showScriptLink && (
          <p className="text-[11px] text-slate-500">
            Full script:{' '}
            <Link href="/dry-run" className="text-amber-900 font-medium hover:underline">
              /dry-run
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
