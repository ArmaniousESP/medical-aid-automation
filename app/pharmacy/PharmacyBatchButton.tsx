'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PharmacyBatchButton({
  period,
  label,
}: {
  period: string;
  /** Optional count hint shown on the button */
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    if (
      !confirm(
        `Approve + dispense all open cycles for ${period}?\n\nاعتماد وصرف كل الدورات المفتوحة لفترة ${period}؟\n\nThis marks cycles as dispensed for pharmacy fulfillment.`
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
          notes: `Pharmacy batch dispense — ${period}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(
        `Done: ${data.ok_count ?? 0}/${data.processed ?? 0} cycles · تم`
      );
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 font-medium"
      >
        {loading
          ? '…'
          : label || `Approve + dispense · ${period}`}
      </button>
      {msg && (
        <span className="text-xs text-slate-600" dir="auto">
          {msg}
        </span>
      )}
    </div>
  );
}
