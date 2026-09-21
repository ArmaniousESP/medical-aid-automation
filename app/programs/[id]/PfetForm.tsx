'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function localPreview(v: {
  hh: number;
  income: number;
  med: number;
  other: number;
}) {
  const residual = v.income - v.other - v.med;
  const perCapita = residual / Math.max(1, v.hh);
  let tier = 'review';
  let pct = 0;
  if (v.income <= 0 && v.med > 0) {
    tier = 'review';
  } else if (perCapita < 500 || residual < 0) {
    tier = 'full_cover';
    pct = 0;
  } else if (perCapita < 2000) {
    tier = 'partial';
    pct = 25;
  } else if (perCapita < 5000) {
    tier = 'partial';
    pct = 50;
  } else {
    tier = 'self_pay';
    pct = 100;
  }
  const share = Math.round(((v.med * pct) / 100) * 100) / 100;
  return { tier, pct, share, residual, perCapita: Math.round(perCapita) };
}

export function PfetForm({ programId }: { programId: string }) {
  const [hh, setHh] = useState(4);
  const [income, setIncome] = useState(0);
  const [med, setMed] = useState(0);
  const [other, setOther] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const preview = useMemo(
    () => localPreview({ hh, income, med, other }),
    [hh, income, med, other]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/psp/pfet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          household_size: hh,
          monthly_income_egp: income,
          monthly_med_cost_egp: med,
          other_burden_egp: other,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(data.summary_ar || data.tier);
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className="text-xs text-slate-500">
        Ability-to-pay (open policy rules — not Axios proprietary PFET).
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Household size
          <input
            type="number"
            min={1}
            value={hh}
            onChange={(e) => setHh(Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Monthly income (EGP)
          <input
            type="number"
            min={0}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Monthly med cost (EGP)
          <input
            type="number"
            min={0}
            value={med}
            onChange={(e) => setMed(Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Other burden (EGP)
          <input
            type="number"
            min={0}
            value={other}
            onChange={(e) => setOther(Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      </div>
      <div className="rounded border bg-slate-50 p-2 text-xs">
        Preview: <strong>{preview.tier}</strong> · patient share {preview.pct}% ≈{' '}
        {preview.share} EGP · residual/capita {preview.perCapita}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-teal-600 px-3 py-1.5 text-white disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save eligibility (PFET-style)'}
      </button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </form>
  );
}
