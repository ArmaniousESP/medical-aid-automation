'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RefillActions(props: {
  cycleId: string;
  itemId?: string;
  mode: 'decide' | 'dispense';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected' | 'skipped') {
    if (!props.itemId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/refills/${props.cycleId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: props.itemId,
          decision,
          reviewed_by: 'reviewer-ui',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function dispense() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/refills/${props.cycleId}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'reviewer-ui', notes: 'Dispensed from UI' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (props.mode === 'dispense') {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <button
          type="button"
          disabled={loading}
          onClick={dispense}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? '…' : 'تعليمليم تم الصرف (Dispense)'}
        </button>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => decide('approved')}
        className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white disabled:opacity-50"
      >
        اعتماد
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => decide('rejected')}
        className="rounded bg-red-600 px-2 py-0.5 text-xs text-white disabled:opacity-50"
      >
        رفض
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => decide('skipped')}
        className="rounded bg-slate-500 px-2 py-0.5 text-xs text-white disabled:opacity-50"
      >
        تخطي
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
