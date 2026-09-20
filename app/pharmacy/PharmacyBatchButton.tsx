'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PharmacyBatchButton({ period }: { period: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    if (
      !confirm(
        `اعتماد وصرف كل الدورات غير المصروفة لفترة ${period}؟\nسيتم تحويلها إلى «مصروف» للصيدلية.`
      )
    ) {
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/pharmacy/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          actor: 'pharmacy-ui',
          notes: `صرف صيدلية — دفعة ${period}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg(`تم: ${data.ok_count}/${data.processed} دورة`);
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded bg-indigo-600 px-3 py-1 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'جاري…' : 'اعتماد + صرف الدفعة'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}
