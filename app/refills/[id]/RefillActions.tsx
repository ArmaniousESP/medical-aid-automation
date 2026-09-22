'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SafetyReport = {
  requires_ack: boolean;
  summary: string;
  ddi_hits?: Array<{ level: string; drug_a: string; drug_b: string }>;
  allergy_hits?: Array<{ risk: string; allergy_label: string; med_name: string }>;
};

export function RefillActions({
  cycleId,
  items,
  cycleStatus,
  safety,
}: {
  cycleId: string;
  items: Array<{ id: string; status: string; drug_name: string }>;
  cycleStatus: string;
  safety?: SafetyReport | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ack, setAck] = useState(false);

  const pending = items.filter((i) => i.status === 'pending');
  const canDispense = ['approved', 'partially_approved'].includes(cycleStatus);
  const needsAck = !!safety?.requires_ack;

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
        body: JSON.stringify({
          itemId,
          decision,
          reviewed_by: 'ui',
          acknowledge_safety: ack,
        }),
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
        body: JSON.stringify({
          approveAll: true,
          reviewed_by: 'ui',
          acknowledge_safety: ack,
        }),
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
        body: JSON.stringify({ actor: 'ui', acknowledge_safety: ack }),
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
      {safety && (safety.requires_ack || (safety.ddi_hits?.length ?? 0) > 0) && (
        <div
          className={`rounded-lg border p-3 text-xs space-y-2 ${
            safety.requires_ack
              ? 'border-red-300 bg-red-50 text-red-950'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-semibold">
            Safety triage: {safety.summary}
          </p>
          {safety.ddi_hits?.slice(0, 5).map((h, i) => (
            <p key={`d${i}`}>
              DDI {h.level}: {h.drug_a} × {h.drug_b}
            </p>
          ))}
          {safety.allergy_hits?.slice(0, 5).map((h, i) => (
            <p key={`a${i}`}>
              Allergy {h.risk}: {h.allergy_label} vs {h.med_name}
            </p>
          ))}
          {needsAck && (
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I reviewed these flags with a pharmacist/clinician and accept
                responsibility to proceed (ops acknowledgment — not clinical CDS).
              </span>
            </label>
          )}
        </div>
      )}

      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {err}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {pending.length > 0 && (
          <button
            type="button"
            disabled={!!loading || (needsAck && !ack)}
            onClick={approveAll}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === 'all'
              ? '…'
              : `Approve all pending (${pending.length})`}
          </button>
        )}
        {canDispense && (
          <button
            type="button"
            disabled={!!loading || (needsAck && !ack)}
            onClick={dispense}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === 'dispense' ? '…' : 'Confirm dispense'}
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
                  disabled={!!loading || (needsAck && !ack)}
                  onClick={() => decide(item.id, 'approved')}
                  className="rounded bg-emerald-100 px-2 py-1 text-emerald-800 text-xs disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => decide(item.id, 'rejected')}
                  className="rounded bg-red-100 px-2 py-1 text-red-800 text-xs"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => decide(item.id, 'skipped')}
                  className="rounded bg-slate-100 px-2 py-1 text-slate-600 text-xs"
                >
                  Skip
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
