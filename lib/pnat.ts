/**
 * PNAT — Patient Needs Assessment Tool (Axios-inspired)
 * Grounded in WHO five dimensions of adherence to long-term therapy
 * (Sabaté, 2003 / WHO framework).
 *
 * Score scale per dimension: 1 = low barrier (good) … 5 = high barrier (risk)
 * Higher score ⇒ higher non-adherence risk on that dimension.
 */

export type PnatDimensionKey =
  | 'social_economic'
  | 'health_system'
  | 'condition'
  | 'therapy'
  | 'patient';

export type PnatScores = Partial<Record<PnatDimensionKey, number>>;

export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export type DimensionDef = {
  key: PnatDimensionKey;
  label_en: string;
  label_ar: string;
  /** Relative weight in composite risk (sums ~1.0) */
  weight: number;
  /** Example barrier prompts for assessors */
  prompts_ar: string[];
  /** Default interventions when dimension score >= 4 */
  interventions_ar: string[];
};

/**
 * WHO five dimensions with operational weights for corporate chronic aid.
 * Therapy + patient often drive drop-out in chronic med programs → slightly higher weight.
 */
export const PNAT_DIMENSIONS: DimensionDef[] = [
  {
    key: 'social_economic',
    label_en: 'Social / economic',
    label_ar: 'اجتماعي / اقتصادي',
    weight: 0.22,
    prompts_ar: [
      'هل تكلفة الدواء أو المواصلات تمثّل عبئاً؟',
      'هل يوجد دعم أسري منتظم؟',
      'مستوى الثقافة الصحية / القدرة على قراءة التعليمات؟',
      'استقرار السكن والعمل؟',
    ],
    interventions_ar: [
      'مراجعة أهلية PFET / مشاركة التكلفة',
      'تسهيل الاستلام من نقطة قريبة أو شحن',
      'مواد تثقيفية مبسّطة بالعربية',
    ],
  },
  {
    key: 'health_system',
    label_en: 'Health system / provider',
    label_ar: 'منظومة صحية / مقدّم رعاية',
    weight: 0.15,
    prompts_ar: [
      'سهولة الوصول للروشتة والمتابعة؟',
      'وضوح خطة العلاج من الطبيب؟',
      'استمرارية نفس الطبيب / الصيدلية؟',
      'تأخير في الاعتماد أو الصرف؟',
    ],
    interventions_ar: [
      'تذكير بمواعيد تجديد الروشتة',
      'نقطة اتصال واحدة للبرنامج',
      'تسريع مسار الاعتماد للصرف الشهري',
    ],
  },
  {
    key: 'condition',
    label_en: 'Condition-related',
    label_ar: 'مرتبط بالحالة المرضية',
    weight: 0.18,
    prompts_ar: [
      'هل الأعراض غير ظاهرة فيشجّع على إيقاف الدواء؟',
      'شدة المرض / إعاقة يومية؟',
      'أمراض مصاحبة (اكتئاب، سكري، ضغط)؟',
      'معدل تقدّم المرض كما يراه المريض؟',
    ],
    interventions_ar: [
      'شرح أن المزمن يحتاج انتظاماً حتى بلا أعراض',
      'تنسيق مع طبيب الحالة إن لزم',
      'متابعة تحاليل دورية إن وُجدت',
    ],
  },
  {
    key: 'therapy',
    label_en: 'Therapy / regimen',
    label_ar: 'مرتبط بالعلاج / النظام الدوائي',
    weight: 0.25,
    prompts_ar: [
      'عدد الأدوية والجرعات يومياً؟',
      'آثار جانبية فعلية أو متوقعة؟',
      'صعوبة تقنية (استنشاق، حقن)؟',
      'تغييرات متكررة في الروشتة؟',
    ],
    interventions_ar: [
      'تبسيط الجدول أو مزامنة الجرعات',
      'بديل EVA إن وُجد بنفس المادة',
      'تثقيف عن الآثار الجانبية ومتى يراجع الطبيب',
    ],
  },
  {
    key: 'patient',
    label_en: 'Patient-related',
    label_ar: 'مرتبط بالمريض (سلوك / معتقدات)',
    weight: 0.2,
    prompts_ar: [
      'نسيان الجرعات؟',
      'معتقدات حول الدواء أو المرض؟',
      'الثقة بالقدرة على الالتزام؟',
      'ضغوط نفسية أو نسيان مرتبط بالعمل؟',
    ],
    interventions_ar: [
      'تذكير شهري قبل موعد الصرف',
      'إشراك مرافق/قريب إن ناسب',
      'خطة متابعة بعد أول شهرين (أعلى خطر انقطاع)',
    ],
  },
];

export function clampScore(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.min(5, Math.max(1, Math.round(v)));
}

export function normalizeScores(raw: PnatScores): Record<PnatDimensionKey, number> {
  const out = {} as Record<PnatDimensionKey, number>;
  for (const d of PNAT_DIMENSIONS) {
    const c = clampScore(raw[d.key]);
    // Missing dimension defaults to 3 (uncertain / moderate) — forces explicit review
    out[d.key] = c ?? 3;
  }
  return out;
}

export type PnatResult = {
  scores: Record<PnatDimensionKey, number>;
  /** Weighted mean 1–5 */
  composite: number;
  /** Unweighted mean */
  simple_avg: number;
  /** Max single-dimension score (catches critical spikes) */
  max_dimension: number;
  risk_band: RiskBand;
  risk_score_0_100: number;
  high_risk_dimensions: PnatDimensionKey[];
  recommended_interventions: string[];
  summary_ar: string;
};

/**
 * Core PNAT engine.
 *
 * Risk bands (composite + spike rule):
 * - low:      composite < 2.2 and max < 4
 * - medium:  composite < 3.2 and max < 5
 * - high:     composite < 4.0 or any dimension == 5 with composite < 4.5
 * - critical: composite >= 4.0 or (max == 5 and ≥2 dimensions >= 4)
 */
export function evaluatePnat(raw: PnatScores): PnatResult {
  const scores = normalizeScores(raw);

  let weighted = 0;
  let simple = 0;
  let maxDim = 1;
  const high: PnatDimensionKey[] = [];

  for (const d of PNAT_DIMENSIONS) {
    const s = scores[d.key];
    weighted += s * d.weight;
    simple += s;
    if (s > maxDim) maxDim = s;
    if (s >= 4) high.push(d.key);
  }
  simple /= PNAT_DIMENSIONS.length;

  const composite = Math.round(weighted * 100) / 100;
  const dimsAt4Plus = high.length;
  const dimsAt5 = PNAT_DIMENSIONS.filter((d) => scores[d.key] === 5).length;

  let risk_band: RiskBand;
  if (composite >= 4.0 || (dimsAt5 >= 1 && dimsAt4Plus >= 2)) {
    risk_band = 'critical';
  } else if (composite >= 3.2 || maxDim >= 5) {
    risk_band = 'high';
  } else if (composite >= 2.2 || maxDim >= 4) {
    risk_band = 'medium';
  } else {
    risk_band = 'low';
  }

  // Map 1–5 composite → 0–100 risk (1→0, 5→100)
  const risk_score_0_100 = Math.round(((composite - 1) / 4) * 100);

  const recommended_interventions: string[] = [];
  const seen = new Set<string>();
  for (const d of PNAT_DIMENSIONS) {
    if (scores[d.key] < 4) continue;
    for (const i of d.interventions_ar) {
      if (!seen.has(i)) {
        seen.add(i);
        recommended_interventions.push(i);
      }
    }
  }
  // Band-level defaults
  if (risk_band === 'critical') {
    recommended_interventions.unshift('اتصال رعاية خلال 48 ساعة + مراجعة أهلية');
  } else if (risk_band === 'high') {
    recommended_interventions.unshift('متابعة هاتفية خلال أسبوع من الصرف');
  } else if (risk_band === 'medium') {
    recommended_interventions.push('تذكير بموعد الصرف التالي');
  }

  const dimLabels = high
    .map((k) => PNAT_DIMENSIONS.find((d) => d.key === k)?.label_ar || k)
    .join('، ');

  const summary_ar =
    risk_band === 'low'
      ? `خطر انقطاع منخفض (مركّب ${composite}). الالتزام المتوقع جيد.`
      : risk_band === 'medium'
        ? `خطر متوسط (مركّب ${composite}). راقب الأبعاد: ${dimLabels || '—'}.`
        : risk_band === 'high'
          ? `خطر مرتفع (مركّب ${composite}). أبعاد حرجة: ${dimLabels || '—'}.`
          : `خطر حرج (مركّب ${composite}). تدخل فوري — أبعاد: ${dimLabels || '—'}.`;

  return {
    scores,
    composite,
    simple_avg: Math.round(simple * 100) / 100,
    max_dimension: maxDim,
    risk_band,
    risk_score_0_100,
    high_risk_dimensions: high,
    recommended_interventions,
    summary_ar,
  };
}

/**
 * Optional structured checklist → dimension scores.
 * Each item true = barrier present → contributes +1 toward dimension (capped 5).
 */
export type PnatChecklist = {
  social_economic?: {
    cost_burden?: boolean;
    weak_family_support?: boolean;
    low_health_literacy?: boolean;
    unstable_housing_work?: boolean;
  };
  health_system?: {
    hard_to_renew_rx?: boolean;
    unclear_plan?: boolean;
    delayed_approval?: boolean;
    no_continuity?: boolean;
  };
  condition?: {
    asymptomatic_stop_risk?: boolean;
    high_disability?: boolean;
    comorbidities?: boolean;
    rapid_progression_fear?: boolean;
  };
  therapy?: {
    complex_regimen?: boolean;
    side_effects?: boolean;
    technique_difficulty?: boolean;
    frequent_changes?: boolean;
  };
  patient?: {
    forgetfulness?: boolean;
    belief_barriers?: boolean;
    low_self_efficacy?: boolean;
    stress_workload?: boolean;
  };
};

export function scoresFromChecklist(check: PnatChecklist): PnatScores {
  const countTrue = (obj?: Record<string, boolean | undefined>) =>
    obj ? Object.values(obj).filter(Boolean).length : 0;

  // 0 barriers → 1, 1 → 2, 2 → 3, 3 → 4, 4+ → 5
  const toScore = (n: number) => Math.min(5, Math.max(1, n + 1));

  return {
    social_economic: toScore(countTrue(check.social_economic)),
    health_system: toScore(countTrue(check.health_system)),
    condition: toScore(countTrue(check.condition)),
    therapy: toScore(countTrue(check.therapy)),
    patient: toScore(countTrue(check.patient)),
  };
}

/** Suggest med-count driven therapy baseline (complexity proxy). */
export function therapyScoreFromMedCount(medCount: number): number {
  if (medCount <= 1) return 1;
  if (medCount === 2) return 2;
  if (medCount <= 4) return 3;
  if (medCount <= 6) return 4;
  return 5;
}
