'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * WHO five dimensions of adherence (Sabaté / WHO long-term therapies).
 * Checklist items = barriers. More barriers → higher dimension score (1–5).
 */

type DimKey =
  | 'social_economic'
  | 'health_system'
  | 'condition'
  | 'therapy'
  | 'patient';

type ChecklistItem = {
  key: string;
  label_en: string;
  label_ar: string;
};

type DimBlock = {
  key: DimKey;
  label_en: string;
  label_ar: string;
  items: ChecklistItem[];
};

const DIMENSIONS: DimBlock[] = [
  {
    key: 'social_economic',
    label_en: '1 · Social / economic',
    label_ar: 'اجتماعي / اقتصادي',
    items: [
      {
        key: 'cost_burden',
        label_en: 'Medicine or transport cost is a burden',
        label_ar: 'تكلفة الدواء أو المواصلات عبء',
      },
      {
        key: 'weak_family_support',
        label_en: 'Limited family / caregiver support',
        label_ar: 'دعم أسري أو مقدّم رعاية محدود',
      },
      {
        key: 'low_health_literacy',
        label_en: 'Hard to read / follow instructions',
        label_ar: 'صعوبة قراءة أو فهم التعليمات',
      },
      {
        key: 'unstable_housing_work',
        label_en: 'Unstable housing or work situation',
        label_ar: 'سكن أو عمل غير مستقر',
      },
    ],
  },
  {
    key: 'health_system',
    label_en: '2 · Health system / care access',
    label_ar: 'منظومة صحية / الوصول للرعاية',
    items: [
      {
        key: 'hard_to_renew_rx',
        label_en: 'Hard to renew prescription or follow-up',
        label_ar: 'صعوبة تجديد الروشتة أو المتابعة',
      },
      {
        key: 'unclear_plan',
        label_en: 'Treatment plan from doctor is unclear',
        label_ar: 'خطة العلاج من الطبيب غير واضحة',
      },
      {
        key: 'delayed_approval',
        label_en: 'Delays in approval or dispensing',
        label_ar: 'تأخير في الاعتماد أو الصرف',
      },
      {
        key: 'no_continuity',
        label_en: 'No continuity (changing doctor / pharmacy)',
        label_ar: 'عدم استمرارية الطبيب أو الصيدلية',
      },
    ],
  },
  {
    key: 'condition',
    label_en: '3 · Condition-related',
    label_ar: 'مرتبط بالحالة المرضية',
    items: [
      {
        key: 'asymptomatic_stop_risk',
        label_en: 'Feels well → may stop chronic meds',
        label_ar: 'يشعر بتحسّن فيميل لإيقاف المزمن',
      },
      {
        key: 'high_disability',
        label_en: 'High daily disability / symptom burden',
        label_ar: 'إعاقة يومية أو عبء أعراض مرتفع',
      },
      {
        key: 'comorbidities',
        label_en: 'Important comorbidities (e.g. depression)',
        label_ar: 'أمراض مصاحبة مؤثرة (مثل الاكتئاب)',
      },
      {
        key: 'rapid_progression_fear',
        label_en: 'Fear that disease is progressing fast',
        label_ar: 'خوف من تقدّم المرض بسرعة',
      },
    ],
  },
  {
    key: 'therapy',
    label_en: '4 · Therapy-related',
    label_ar: 'مرتبط بالعلاج',
    items: [
      {
        key: 'complex_regimen',
        label_en: 'Complex regimen (many pills / times)',
        label_ar: 'جدول دوائي معقّد',
      },
      {
        key: 'side_effects',
        label_en: 'Side effects bothering the patient',
        label_ar: 'آثار جانبية مزعجة',
      },
      {
        key: 'technique_difficulty',
        label_en: 'Hard technique (inhaler, injection…)',
        label_ar: 'صعوبة تقنية الاستخدام',
      },
      {
        key: 'frequent_changes',
        label_en: 'Frequent medicine changes',
        label_ar: 'تغييرات متكررة في الأدوية',
      },
    ],
  },
  {
    key: 'patient',
    label_en: '5 · Patient-related',
    label_ar: 'مرتبط بالمريض',
    items: [
      {
        key: 'forgetfulness',
        label_en: 'Forgets doses often',
        label_ar: 'ينسى الجرعات كثيراً',
      },
      {
        key: 'belief_barriers',
        label_en: 'Beliefs against long-term medicine',
        label_ar: 'معتقدات ضد العلاج طويل الأمد',
      },
      {
        key: 'low_self_efficacy',
        label_en: 'Low confidence managing the condition',
        label_ar: 'ثقة منخفضة في إدارة الحالة',
      },
      {
        key: 'stress_workload',
        label_en: 'High stress / workload affects adherence',
        label_ar: 'ضغط عمل أو توتر يؤثر على الالتزام',
      },
    ],
  },
];

const WEIGHTS: Record<DimKey, number> = {
  social_economic: 0.22,
  health_system: 0.15,
  condition: 0.18,
  therapy: 0.25,
  patient: 0.2,
};

const BAND_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
  medium: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  high: 'bg-orange-100 text-orange-950 ring-1 ring-orange-200',
  critical: 'bg-red-100 text-red-900 ring-1 ring-red-200',
};

const BAND_LABEL: Record<string, string> = {
  low: 'Low risk · منخفض',
  medium: 'Medium · متوسط',
  high: 'High · مرتفع',
  critical: 'Critical · حرج',
};

type ChecklistState = Record<DimKey, Record<string, boolean>>;

function emptyChecklist(medCount: number): ChecklistState {
  const base: ChecklistState = {
    social_economic: {},
    health_system: {},
    condition: {},
    therapy: {},
    patient: {},
  };
  // Pre-tick complexity if many active meds (therapy proxy)
  if (medCount >= 5) {
    base.therapy.complex_regimen = true;
  }
  return base;
}

function scoreDim(flags: Record<string, boolean> | undefined) {
  const n = flags ? Object.values(flags).filter(Boolean).length : 0;
  return Math.min(5, Math.max(1, n + 1));
}

function previewFromChecklist(check: ChecklistState) {
  const scores: Record<DimKey, number> = {
    social_economic: scoreDim(check.social_economic),
    health_system: scoreDim(check.health_system),
    condition: scoreDim(check.condition),
    therapy: scoreDim(check.therapy),
    patient: scoreDim(check.patient),
  };
  let composite = 0;
  let max = 1;
  const high: string[] = [];
  for (const d of DIMENSIONS) {
    const s = scores[d.key];
    composite += s * WEIGHTS[d.key];
    if (s > max) max = s;
    if (s >= 4) high.push(d.label_en.split('·')[1]?.trim() || d.key);
  }
  composite = Math.round(composite * 100) / 100;
  const dimsAt5 = DIMENSIONS.filter((d) => scores[d.key] === 5).length;
  let band = 'low';
  if (composite >= 4 || (dimsAt5 >= 1 && high.length >= 2)) band = 'critical';
  else if (composite >= 3.2 || max >= 5) band = 'high';
  else if (composite >= 2.2 || max >= 4) band = 'medium';
  return { scores, composite, band, high };
}

export function PnatForm({
  programId,
  medCount,
}: {
  programId: string;
  medCount: number;
}) {
  const [check, setCheck] = useState<ChecklistState>(() =>
    emptyChecklist(medCount)
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const router = useRouter();

  const preview = useMemo(() => previewFromChecklist(check), [check]);

  function toggle(dim: DimKey, itemKey: string) {
    setCheck((prev) => ({
      ...prev,
      [dim]: {
        ...prev[dim],
        [itemKey]: !prev[dim]?.[itemKey],
      },
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setMsgOk(false);
    try {
      const res = await fetch('/api/psp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'pnat',
          program_id: programId,
          checklist: check,
          notes: notes || undefined,
          assessor: 'program-ui',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsgOk(true);
      setMsg(
        data.summary_ar ||
          `${data.risk_band || preview.band} · composite ${data.composite ?? preview.composite}`
      );
      router.refresh();
    } catch (err: unknown) {
      setMsgOk(false);
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 text-sm">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 space-y-1">
        <p className="font-semibold text-indigo-950">
          WHO-aligned needs assessment · تقييم الاحتياج
        </p>
        <p className="text-[11px] text-indigo-900/80 leading-relaxed">
          Based on WHO five dimensions of adherence to long-term therapy. Tick
          barriers that apply — not a clinical diagnosis. · ضع علامة على الحواجز
          الموجودة (ليس تشخيصاً طبياً).
        </p>
        <p className="text-[11px] text-indigo-800/70">
          Active meds on file: <strong>{medCount}</strong>
          {medCount >= 5 ? ' · complex regimen pre-checked' : ''}
        </p>
      </div>

      <div className="space-y-4">
        {DIMENSIONS.map((dim) => {
          const score = preview.scores[dim.key];
          return (
            <fieldset
              key={dim.key}
              className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
            >
              <legend className="px-1 text-xs font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                <span>{dim.label_en}</span>
                <span className="text-slate-400 font-normal" dir="rtl">
                  {dim.label_ar}
                </span>
                <span className="ml-auto tabular-nums text-[11px] font-medium text-slate-500">
                  score {score}/5
                </span>
              </legend>
              <div className="space-y-1.5">
                {dim.items.map((item) => {
                  const on = !!check[dim.key]?.[item.key];
                  return (
                    <label
                      key={item.key}
                      className={`flex gap-2.5 items-start rounded-lg border px-2.5 py-2 cursor-pointer transition ${
                        on
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(dim.key, item.key)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-slate-800 leading-snug">
                          {item.label_en}
                        </span>
                        <span
                          className="block text-[11px] text-slate-500 mt-0.5"
                          dir="rtl"
                        >
                          {item.label_ar}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="rounded-xl border bg-slate-50 p-3 flex flex-wrap gap-3 items-center">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${BAND_COLOR[preview.band] || 'bg-slate-100'}`}
        >
          {BAND_LABEL[preview.band] || preview.band}
        </span>
        <span className="text-slate-600 text-xs">
          Weighted composite: <strong>{preview.composite}</strong>
        </span>
        {preview.high.length > 0 && (
          <span className="text-[11px] text-amber-800">
            Elevated: {preview.high.join(', ')}
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Notes · ملاحظات
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Optional context for the care team"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
      >
        {loading ? 'Saving…' : 'Save assessment · حفظ التقييم'}
      </button>

      {msg && (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            msgOk
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-amber-50 text-amber-950 border border-amber-200'
          }`}
        >
          {msg}
        </p>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Framework: WHO dimensions of adherence to long-term therapies. Internal
        program tool — not a licensed copy of any vendor proprietary instrument.
      </p>
    </form>
  );
}
