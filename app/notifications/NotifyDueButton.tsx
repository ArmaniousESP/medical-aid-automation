'use client';

import { useState } from 'react';

export function NotifyDueButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run(dry: boolean) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify_due', dry_run: dry, limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setResult(
        `${data.dry_run || dry ? 'تجريبي' : 'إرسال'}: ${data.ok_count}/${data.attempted} · مزوّد ${data.provider}`
      );
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <h2 className="font-medium text-sm">دفعة تذكير المستحقين</h2>
      <p className="text-xs text-slate-500">
        يرسل قالب refill_due لكل برنامج نشط له رقم هاتف ولم يُصرف هذا الشهر.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true)}
          className="rounded bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? '…' : 'تجربة (dry run)'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(false)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          إرسال حقيقي
        </button>
      </div>
      {result && <p className="text-xs text-slate-600">{result}</p>}
    </div>
  );
}
