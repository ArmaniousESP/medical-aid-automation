'use client';

import { useState } from 'react';
import { useDryRunMode } from './useDryRunMode';
import { WaDryRunSwitch, confirmLiveSend } from './WaDryRunSwitch';

export function NotifyDueButton() {
  const { dryRun } = useDryRunMode();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    const useDry = dryRun;
    if (!useDry && !confirmLiveSend('notify due refills')) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify_due', dry_run: useDry, limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setResult(
        `${useDry || data.dry_run ? 'تجريبي / dry-run' : 'إرسال حي / live'}: ${data.ok_count}/${data.attempted} · مزوّد ${data.provider}`
      );
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-sm text-slate-900">دفعة تذكير المستحقين</h2>
          <p className="text-xs text-slate-500 mt-1">
            يرسل قالب refill_due لكل برنامج نشط له رقم هاتف ولم يُصرف هذا الشهر.
          </p>
        </div>
        <WaDryRunSwitch />
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
          dryRun ? 'bg-slate-700 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {loading ? '…' : dryRun ? '▶ Dry-run notify due' : '▶ Send live notify due'}
      </button>
      {result && <p className="text-xs text-slate-600 font-mono">{result}</p>}
    </div>
  );
}
