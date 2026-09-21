/**
 * Transparent ability-to-pay assessment (PFET-inspired).
 * NOT Axios proprietary PFET — simple policy rules for corporate programs.
 *
 * Inputs are optional; missing fields use conservative defaults.
 */

import { query } from '@/lib/db';

export type PfetInput = {
  program_id: string;
  household_size?: number;
  monthly_income_egp?: number;
  monthly_med_cost_egp?: number;
  other_burden_egp?: number;
  assessor?: string;
  notes?: string;
};

export type PfetResult = {
  ability_score: number; // 0–100 higher = more able to self-pay
  tier: 'full_cover' | 'partial' | 'self_pay' | 'review';
  patient_share_pct: number;
  patient_share_egp: number;
  summary_ar: string;
};

/**
 * Ability score heuristic:
 * - residual = income - other_burden - med_cost
 * - residual per capita vs simple brackets (EGP/month, policy-tunable)
 */
export function evaluatePfet(input: {
  household_size?: number;
  monthly_income_egp?: number;
  monthly_med_cost_egp?: number;
  other_burden_egp?: number;
}): PfetResult {
  const hh = Math.max(1, Number(input.household_size) || 1);
  const income = Math.max(0, Number(input.monthly_income_egp) || 0);
  const med = Math.max(0, Number(input.monthly_med_cost_egp) || 0);
  const other = Math.max(0, Number(input.other_burden_egp) || 0);

  const residual = income - other - med;
  const perCapita = residual / hh;

  // Policy brackets (corporate aid — adjust freely)
  let tier: PfetResult['tier'];
  let patient_share_pct: number;

  if (income <= 0 && med > 0) {
    tier = 'review';
    patient_share_pct = 0;
  } else if (perCapita < 500 || residual < 0) {
    tier = 'full_cover';
    patient_share_pct = 0;
  } else if (perCapita < 2000) {
    tier = 'partial';
    patient_share_pct = 25;
  } else if (perCapita < 5000) {
    tier = 'partial';
    patient_share_pct = 50;
  } else {
    tier = 'self_pay';
    patient_share_pct = 100;
  }

  const patient_share_egp =
    Math.round(((med * patient_share_pct) / 100) * 100) / 100;

  // ability_score 0–100 from residual/med ratio
  let ability_score = 50;
  if (med > 0) {
    ability_score = Math.min(100, Math.max(0, Math.round((residual / med) * 25 + 50)));
  } else if (income > 0) {
    ability_score = 80;
  }

  const summary_ar =
    tier === 'full_cover'
      ? `تغطية كاملة مقترحة · حصة المريض 0% (${patient_share_egp} EGP)`
      : tier === 'partial'
        ? `مشاركة ${patient_share_pct}% · حصة المريض ≈ ${patient_share_egp} EGP`
        : tier === 'self_pay'
          ? `قدرة أعلى على التحمل · ذاتي ${patient_share_pct}%`
          : `بيانات غير كافية — مراجعة يدوية`;

  return {
    ability_score,
    tier,
    patient_share_pct,
    patient_share_egp,
    summary_ar,
  };
}

export async function ensurePfetTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pfet_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        assessor TEXT,
        household_size INT,
        monthly_income_egp NUMERIC(14,2),
        monthly_med_cost_egp NUMERIC(14,2),
        other_burden_egp NUMERIC(14,2),
        ability_score NUMERIC(5,2),
        tier TEXT,
        patient_share_pct NUMERIC(5,2),
        patient_share_egp NUMERIC(14,2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  } catch {
    /* ignore */
  }
}

export async function savePfetAssessment(input: PfetInput) {
  await ensurePfetTable();
  const result = evaluatePfet(input);

  const ins = await query<{ id: string }>(
    `INSERT INTO pfet_assessments (
       program_id, assessor, household_size, monthly_income_egp,
       monthly_med_cost_egp, other_burden_egp, ability_score, tier,
       patient_share_pct, patient_share_egp, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      input.program_id,
      input.assessor || 'ops',
      input.household_size ?? null,
      input.monthly_income_egp ?? null,
      input.monthly_med_cost_egp ?? null,
      input.other_burden_egp ?? null,
      result.ability_score,
      result.tier,
      result.patient_share_pct,
      result.patient_share_egp,
      input.notes || result.summary_ar,
    ]
  );

  await query(
    `UPDATE chronic_programs SET
       eligibility_tier = $2,
       monthly_patient_share_egp = $3,
       journey_stage = CASE
         WHEN coalesce(journey_stage,'enrolled') IN ('referred','eligibility')
         THEN 'needs_assessment'
         ELSE journey_stage
       END,
       updated_at = now()
     WHERE id = $1`,
    [input.program_id, result.tier, result.patient_share_egp]
  );

  return { id: ins.rows[0].id, ...result };
}
