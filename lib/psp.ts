import { query } from '@/lib/db';
import {
  evaluatePnat,
  scoresFromChecklist,
  type PnatChecklist,
  type PnatScores,
  PNAT_DIMENSIONS as PNAT_DIMS_FULL,
} from '@/lib/pnat';

export const JOURNEY_STAGES = [
  'referred',
  'eligibility',
  'needs_assessment',
  'enrolled',
  'on_treatment',
  'follow_up',
  'completed',
  'dropped_out',
  'suspended',
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const JOURNEY_LABELS_AR: Record<string, string> = {
  referred: 'إحالة',
  eligibility: 'أهلية (PFET)',
  needs_assessment: 'تقييم احتياج (PNAT)',
  enrolled: 'مسجّل',
  on_treatment: 'على العلاج',
  follow_up: 'متابعة',
  completed: 'مكتمل',
  dropped_out: 'انقطع',
  suspended: 'موقوف',
};

export const ELIGIBILITY_TIERS = [
  'full_cover',
  'partial',
  'self_pay',
  'review',
] as const;

export const ELIGIBILITY_LABELS_AR: Record<string, string> = {
  full_cover: 'تغطية كاملة',
  partial: 'مشاركة',
  self_pay: 'ذاتي',
  review: 'مراجعة',
};

/** @deprecated use lib/pnat — kept for UI imports */
export const PNAT_DIMENSIONS = PNAT_DIMS_FULL.map((d) => ({
  key: d.key,
  label_ar: d.label_ar,
}));

export type { PnatScores };

export function riskBandFromScores(scores: PnatScores) {
  return evaluatePnat(scores).risk_band;
}

export async function ensurePspColumns() {
  try {
    await query(
      `ALTER TABLE chronic_programs
         ADD COLUMN IF NOT EXISTS eligibility_tier TEXT DEFAULT 'full_cover',
         ADD COLUMN IF NOT EXISTS monthly_patient_share_egp NUMERIC(12,2),
         ADD COLUMN IF NOT EXISTS journey_stage TEXT DEFAULT 'enrolled',
         ADD COLUMN IF NOT EXISTS disease_area TEXT`
    );
  } catch {
    /* ignore */
  }
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS adherence_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        assessor TEXT,
        scores JSONB NOT NULL DEFAULT '{}'::jsonb,
        risk_band TEXT,
        interventions TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  } catch {
    /* ignore */
  }
}

export async function listPspPrograms(opts?: {
  stage?: string;
  q?: string;
  limit?: number;
}) {
  await ensurePspColumns();
  const limit = Math.min(opts?.limit ?? 100, 300);
  const params: unknown[] = [];
  const where = [`cp.status IN ('active','suspended')`];

  if (opts?.stage) {
    params.push(opts.stage);
    where.push(`coalesce(cp.journey_stage, 'enrolled') = $${params.length}`);
  }
  if (opts?.q) {
    params.push(`%${opts.q}%`);
    const i = params.length;
    where.push(
      `(e.full_name ILIKE $${i} OR d.full_name ILIKE $${i} OR cp.program_code ILIKE $${i})`
    );
  }
  params.push(limit);

  const res = await query(
    `SELECT
       cp.id,
       cp.program_code,
       cp.status,
       coalesce(cp.journey_stage, 'enrolled') AS journey_stage,
       coalesce(cp.eligibility_tier, 'full_cover') AS eligibility_tier,
       cp.monthly_patient_share_egp,
       cp.disease_area,
       e.external_employee_id AS employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation,
       (SELECT count(*)::int FROM chronic_med_lines ml
         WHERE ml.program_id = cp.id AND ml.is_active) AS med_count,
       (SELECT count(*)::int FROM attachments a
         WHERE a.entity_type = 'program' AND a.entity_id = cp.id) AS doc_count,
       (SELECT risk_band FROM adherence_assessments aa
         WHERE aa.program_id = cp.id ORDER BY assessed_at DESC LIMIT 1) AS latest_risk
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE ${where.join(' AND ')}
     ORDER BY cp.program_code
     LIMIT $${params.length}`,
    params
  );

  return res.rows as any[];
}

export async function updateJourney(input: {
  program_id: string;
  journey_stage?: string;
  eligibility_tier?: string;
  monthly_patient_share_egp?: number | null;
  disease_area?: string | null;
}) {
  await ensurePspColumns();
  await query(
    `UPDATE chronic_programs SET
       journey_stage = COALESCE($2, journey_stage),
       eligibility_tier = COALESCE($3, eligibility_tier),
       monthly_patient_share_egp = COALESCE($4, monthly_patient_share_egp),
       disease_area = COALESCE($5, disease_area),
       updated_at = now()
     WHERE id = $1`,
    [
      input.program_id,
      input.journey_stage ?? null,
      input.eligibility_tier ?? null,
      input.monthly_patient_share_egp ?? null,
      input.disease_area ?? null,
    ]
  );
}

export async function savePnatAssessment(input: {
  program_id: string;
  scores?: PnatScores;
  checklist?: PnatChecklist;
  assessor?: string;
  interventions?: string;
  notes?: string;
}) {
  await ensurePspColumns();

  const scores: PnatScores = input.checklist
    ? scoresFromChecklist(input.checklist)
    : input.scores || {};

  const result = evaluatePnat(scores);
  const interventionsText =
    input.interventions ||
    result.recommended_interventions.join(' · ');

  const ins = await query<{ id: string }>(
    `INSERT INTO adherence_assessments (
       program_id, assessor, scores, risk_band, interventions, notes
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING id`,
    [
      input.program_id,
      input.assessor || 'ops',
      JSON.stringify({
        ...result.scores,
        _meta: {
          composite: result.composite,
          risk_score_0_100: result.risk_score_0_100,
          summary_ar: result.summary_ar,
        },
      }),
      result.risk_band,
      interventionsText,
      input.notes || result.summary_ar,
    ]
  );

  await query(
    `UPDATE chronic_programs SET
       journey_stage = CASE
         WHEN coalesce(journey_stage,'enrolled') IN ('referred','eligibility','needs_assessment','enrolled')
         THEN 'on_treatment'
         ELSE journey_stage
       END,
       updated_at = now()
     WHERE id = $1`,
    [input.program_id]
  );

  return {
    id: ins.rows[0].id,
    risk_band: result.risk_band,
    composite: result.composite,
    risk_score_0_100: result.risk_score_0_100,
    high_risk_dimensions: result.high_risk_dimensions,
    recommended_interventions: result.recommended_interventions,
    summary_ar: result.summary_ar,
    scores: result.scores,
  };
}

export async function pspSummary() {
  await ensurePspColumns();
  const byStage = await query<{ stage: string; n: string }>(
    `SELECT coalesce(journey_stage, 'enrolled') AS stage, count(*)::text AS n
     FROM chronic_programs WHERE status = 'active'
     GROUP BY 1 ORDER BY count(*) DESC`
  );
  const byTier = await query<{ tier: string; n: string }>(
    `SELECT coalesce(eligibility_tier, 'full_cover') AS tier, count(*)::text AS n
     FROM chronic_programs WHERE status = 'active'
     GROUP BY 1`
  );
  const byRisk = await query<{ risk_band: string; n: string }>(
    `SELECT DISTINCT ON (program_id) risk_band, program_id
     FROM adherence_assessments
     ORDER BY program_id, assessed_at DESC`
  ).catch(() => ({ rows: [] as any[] }));

  // recount risk bands
  const riskCounts: Record<string, number> = {};
  try {
    const rc = await query<{ risk_band: string; n: string }>(
      `SELECT risk_band, count(*)::text AS n FROM (
         SELECT DISTINCT ON (program_id) risk_band
         FROM adherence_assessments
         ORDER BY program_id, assessed_at DESC
       ) t GROUP BY risk_band`
    );
    for (const r of rc.rows) riskCounts[r.risk_band] = Number(r.n);
  } catch {
    /* empty */
  }

  return {
    by_stage: Object.fromEntries(byStage.rows.map((r) => [r.stage, Number(r.n)])),
    by_tier: Object.fromEntries(byTier.rows.map((r) => [r.tier, Number(r.n)])),
    by_risk: riskCounts,
  };
}
