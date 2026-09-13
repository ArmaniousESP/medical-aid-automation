'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RefillActions({
  cycleId,
  items,
  cycleStatus,
}: {
  cycleId: string;
  items: Array<{ id: string; status: string; drug_name: string }>;
  cycleStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = items.filter((i) => i.status === 'pending');
  const canDispense = ['approved', 'partially_approved'].includes(cycleStatus);

  async function decide(
    itemId: string,
    decision: 'approved' | 'rejected' | 'skipped'
  ) {
    setLoading(itemId + decision);
    setErr(null);
    try {
      const res = await fetch(`/api/refills/${cycleId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, decision, reviewed_by: 'ui' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  async function approveAll() {
    setLoading('all');
    setErr(null);
    try {
      const res = await fetch(`/api/refills/${cycleId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approveAll: true, reviewed_by: 'ui' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  async function dispense() {
    setLoading('dispense');
    setErr(null);
    try {
      const res = await fetch(`/api/refills/${cycleId}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'ui' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {err}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {pending.length > 0 && (
          <button
            type="button"
            disabled={!!loading}
            onClick={approveAll}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === 'all'
              ? '…'
              : `اعتماد كل المعلّق (${pending.length})`}
          </button>
        )}
        {canDispense && (
          <button
            type="button"
            disabled={!!loading}
            onClick={dispense}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === 'dispense' ? '…' : 'تأكيد الصرف'}
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <ul className="divide-y rounded border bg-white">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span>{item.drug_name}</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => decide(item.id, 'approved')}
                  className="rounded bg-emerald-100 px-2 py-1 text-emerald-800 text-xs"
                >
                  اعتماد
                </button>
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => decide(item.id, 'rejected')}
                  className="rounded bg-red-100 px-2 py-1 text-red-800 text-xs"
                >
                  رفض
                </button>
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => decide(item.id, 'skipped')}
                  className="rounded bg-slate-100 px-2 py-1 text-slate-600 text-xs"
                >
                  تخطي
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
