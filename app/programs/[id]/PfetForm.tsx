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

const TIER_STYLE: Record<string, string> = {
  full_cover: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  partial: 'border-amber-200 bg-amber-50 text-amber-950',
  self_pay: 'border-slate-200 bg-slate-50 text-slate-800',
  review: 'border-sky-200 bg-sky-50 text-sky-950',
};

const TIER_LABEL: Record<string, string> = {
  full_cover: 'Full cover · تغطية كاملة',
  partial: 'Partial · مشاركة جزئية',
  self_pay: 'Self-pay · تحمل كامل',
  review: 'Needs review · يحتاج مراجعة',
};

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';

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
        credentials: 'include',
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
      setMsg(data.summary_ar || data.tier || 'Saved');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <p className="text-xs text-slate-500 leading-relaxed">
        Ability-to-pay estimate (open policy rules — not a proprietary vendor
        instrument). Live preview updates as you type.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-600">
          Household size · حجم الأسرة
          <input
            type="number"
            min={1}
            value={hh}
            onChange={(e) => setHh(Number(e.target.value) || 1)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Monthly income (EGP) · الدخل الشهري
          <input
            type="number"
            min={0}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value) || 0)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Monthly med cost (EGP) · تكلفة الأدوية
          <input
            type="number"
            min={0}
            value={med}
            onChange={(e) => setMed(Number(e.target.value) || 0)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Other burden (EGP) · أعباء أخرى
          <input
            type="number"
            min={0}
            value={other}
            onChange={(e) => setOther(Number(e.target.value) || 0)}
            className={fieldClass}
          />
        </label>
      </div>

      <div
        className={`rounded-xl border p-3 text-xs space-y-1 ${
          TIER_STYLE[preview.tier] || TIER_STYLE.review
        }`}
      >
        <p className="font-semibold text-sm">
          {TIER_LABEL[preview.tier] || preview.tier}
        </p>
        <p>
          Patient share <strong>{preview.pct}%</strong> ≈{' '}
          <strong>{preview.share}</strong> EGP / month
        </p>
        <p className="opacity-80">
          Residual / capita ≈ {preview.perCapita} EGP · residual total{' '}
          {Math.round(preview.residual)}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save eligibility · حفظ الأهلية'}
      </button>

      {msg && (
        <p className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          {msg}
        </p>
      )}
    </form>
  );
}
