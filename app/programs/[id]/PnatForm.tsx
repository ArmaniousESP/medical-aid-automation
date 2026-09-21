'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const DIMS = [
  { key: 'social_economic', label: 'اجتماعي / اقتصادي' },
  { key: 'health_system', label: 'منظومة صحية' },
  { key: 'condition', label: 'مرتبط بالحالة' },
  { key: 'therapy', label: 'مرتبط بالعلاج' },
  { key: 'patient', label: 'مرتبط بالمريض' },
] as const;

const WEIGHTS: Record<string, number> = {
  social_economic: 0.22,
  health_system: 0.15,
  condition: 0.18,
  therapy: 0.25,
  patient: 0.2,
};

function localPreview(scores: Record<string, number>) {
  let composite = 0;
  let max = 1;
  const high: string[] = [];
  for (const d of DIMS) {
    const s = scores[d.key] ?? 3;
    composite += s * (WEIGHTS[d.key] || 0.2);
    if (s > max) max = s;
    if (s >= 4) high.push(d.key);
  }
  composite = Math.round(composite * 100) / 100;
  const dimsAt5 = DIMS.filter((d) => (scores[d.key] ?? 3) === 5).length;
  let band = 'low';
  if (composite >= 4 || (dimsAt5 >= 1 && high.length >= 2)) band = 'critical';
  else if (composite >= 3.2 || max >= 5) band = 'high';
  else if (composite >= 2.2 || max >= 4) band = 'medium';
  return { composite, band, high };
}

const BAND_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-900',
  critical: 'bg-red-100 text-red-800',
};

export function PnatForm({
  programId,
  medCount,
}: {
  programId: string;
  medCount: number;
}) {
  const therapyDefault =
    medCount <= 1 ? 1 : medCount === 2 ? 2 : medCount <= 4 ? 3 : medCount <= 6 ? 4 : 5;

  const [scores, setScores] = useState<Record<string, number>>({
    social_economic: 2,
    health_system: 2,
    condition: 2,
    therapy: therapyDefault,
    patient: 2,
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const preview = useMemo(() => localPreview(scores), [scores]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/psp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pnat',
          program_id: programId,
          scores,
          notes: notes || undefined,
          assessor: 'program-ui',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setMsg(
        `${data.summary_ar || data.risk_band} · مركّب ${data.composite}`
      );
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <p className="text-xs text-slate-500">
        مقياس 1–5 لكل بُعد (1 = حاجز منخفض · 5 = خطر انقطاع مرتفع). قيمة العلاج
        مُقترحة من عدد الأدوية النشطة ({medCount}).
      </p>

      <div className="space-y-3">
        {DIMS.map((d) => (
          <div key={d.key}>
            <div className="flex justify-between mb-1">
              <label className="font-medium">{d.label}</label>
              <span className="tabular-nums text-slate-600">
                {scores[d.key]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={scores[d.key]}
              onChange={(e) =>
                setScores((s) => ({
                  ...s,
                  [d.key]: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-slate-50 p-3 flex flex-wrap gap-3 items-center">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            BAND_COLOR[preview.band] || 'bg-slate-100'
          }`}
        >
          {preview.band}
        </span>
        <span className="text-slate-600">
          مركّب موزون: <strong>{preview.composite}</strong>
        </span>
        {preview.high.length > 0 && (
          <span className="text-xs text-amber-700">
            أبعاد ≥4: {preview.high.join(', ')}
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border px-2 py-1.5"
          placeholder="اختياري"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'جاري الحفظ…' : 'حفظ تقييم PNAT'}
      </button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </form>
  );
}
