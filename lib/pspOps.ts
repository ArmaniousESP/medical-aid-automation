/**
 * Axios-inspired Patient Support Program operations layer.
 * Public model only — not Axios proprietary software.
 *
 * Covers: adherence plans (from PNAT), adverse events,
 * On-Time Access (OTA) metrics, PMS-style summary.
 */

import { query } from '@/lib/db';

export async function ensurePspOpsTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS adherence_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        assessment_id UUID,
        risk_band TEXT,
        interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
        education_done BOOLEAN DEFAULT false,
        reminder_channel TEXT DEFAULT 'whatsapp',
        next_review_at DATE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await query(`
      CREATE TABLE IF NOT EXISTS adverse_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        severity TEXT DEFAULT 'mild',
        description TEXT NOT NULL,
        med_name TEXT,
        action_taken TEXT,
        reporter TEXT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await query(
      `ALTER TABLE chronic_programs
         ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS first_dispense_at TIMESTAMPTZ`
    );
  } catch {
    /* ignore */
  }
}

/** Create/refresh adherence plan from PNAT result (Axios-style personalized plan) */
export async function upsertAdherencePlan(input: {
  program_id: string;
  assessment_id?: string;
  risk_band: string;
  interventions: string[];
  review_days?: number;
}) {
  await ensurePspOpsTables();

  // Close previous active plans
  await query(
    `UPDATE adherence_plans SET status = 'superseded', updated_at = now()
     WHERE program_id = $1 AND status = 'active'`,
    [input.program_id]
  );

  const days =
    input.review_days ??
    (input.risk_band === 'critical'
      ? 7
      : input.risk_band === 'high'
        ? 14
        : input.risk_band === 'medium'
          ? 30
          : 60);

  const ins = await query<{ id: string }>(
    `INSERT INTO adherence_plans (
       program_id, assessment_id, risk_band, interventions, next_review_at, status
     ) VALUES ($1, $2, $3, $4::jsonb, (CURRENT_DATE + $5::int), 'active')
     RETURNING id`,
    [
      input.program_id,
      input.assessment_id || null,
      input.risk_band,
      JSON.stringify(input.interventions),
      days,
    ]
  );

  return { id: ins.rows[0].id, next_review_days: days };
}

export async function listAdherencePlans(programId: string) {
  await ensurePspOpsTables();
  const res = await query(
    `SELECT * FROM adherence_plans WHERE program_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [programId]
  );
  return res.rows;
}

export async function reportAdverseEvent(input: {
  program_id: string;
  description: string;
  severity?: string;
  med_name?: string;
  action_taken?: string;
  reporter?: string;
}) {
  await ensurePspOpsTables();
  const ins = await query<{ id: string }>(
    `INSERT INTO adverse_events (
       program_id, severity, description, med_name, action_taken, reporter
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.program_id,
      input.severity || 'mild',
      input.description,
      input.med_name || null,
      input.action_taken || null,
      input.reporter || 'ops',
    ]
  );
  return { id: ins.rows[0].id };
}

export async function listAdverseEvents(opts?: {
  program_id?: string;
  open_only?: boolean;
  limit?: number;
}) {
  await ensurePspOpsTables();
  const params: unknown[] = [];
  const where = ['1=1'];
  if (opts?.program_id) {
    params.push(opts.program_id);
    where.push(`program_id = $${params.length}`);
  }
  if (opts?.open_only) {
    where.push(`status = 'open'`);
  }
  params.push(Math.min(opts?.limit ?? 50, 100));
  const res = await query(
    `SELECT ae.*, cp.program_code
     FROM adverse_events ae
     JOIN chronic_programs cp ON cp.id = ae.program_id
     WHERE ${where.join(' AND ')}
     ORDER BY ae.reported_at DESC
     LIMIT $${params.length}`,
    params
  );
  return res.rows;
}

/** Mark first dispense for OTA tracking */
export async function recordFirstDispense(programId: string) {
  await ensurePspOpsTables();
  await query(
    `UPDATE chronic_programs SET
       first_dispense_at = COALESCE(first_dispense_at, now()),
       journey_stage = CASE
         WHEN coalesce(journey_stage,'enrolled') IN ('referred','eligibility','needs_assessment','enrolled')
         THEN 'on_treatment'
         ELSE journey_stage
       END,
       updated_at = now()
     WHERE id = $1`,
    [programId]
  );
}

/**
 * On-Time Access style KPIs:
 * days from enrolled_at → first_dispense_at (Axios OTA aims to shrink this gap)
 */
export async function getPmsDashboard() {
  await ensurePspOpsTables();

  const stages = await query<{ stage: string; n: string }>(
    `SELECT coalesce(journey_stage, 'enrolled') AS stage, count(*)::text AS n
     FROM chronic_programs WHERE status = 'active'
     GROUP BY 1 ORDER BY count(*) DESC`
  );

  const risk = await query<{ risk_band: string; n: string }>(
    `SELECT risk_band, count(*)::text AS n FROM (
       SELECT DISTINCT ON (program_id) risk_band
       FROM adherence_assessments
       ORDER BY program_id, assessed_at DESC
     ) t GROUP BY risk_band`
  ).catch(() => ({ rows: [] as { risk_band: string; n: string }[] }));

  const plansDue = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM adherence_plans
     WHERE status = 'active' AND next_review_at <= CURRENT_DATE + 7`
  ).catch(() => ({ rows: [{ n: '0' }] }));

  const openAe = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM adverse_events WHERE status = 'open'`
  ).catch(() => ({ rows: [{ n: '0' }] }));

  const ota = await query<{
    with_dispense: string;
    avg_days: string | null;
    median_days: string | null;
    under_7_days: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE first_dispense_at IS NOT NULL)::text AS with_dispense,
       round(avg(EXTRACT(EPOCH FROM (first_dispense_at - coalesce(enrolled_at, created_at)))/86400)::numeric, 1)::text AS avg_days,
       percentile_cont(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (first_dispense_at - coalesce(enrolled_at, created_at)))/86400
       )::text AS median_days,
       count(*) FILTER (
         WHERE first_dispense_at IS NOT NULL
           AND first_dispense_at - coalesce(enrolled_at, created_at) <= interval '7 days'
       )::text AS under_7_days
     FROM chronic_programs
     WHERE status = 'active'`
  ).catch(() => ({
    rows: [
      {
        with_dispense: '0',
        avg_days: null,
        median_days: null,
        under_7_days: '0',
      },
    ],
  }));

  const active = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM chronic_programs WHERE status = 'active'`
  );

  const period = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const dueRefills = await query<{ n: string }>(
    `SELECT count(*)::text AS n
     FROM chronic_programs cp
     LEFT JOIN refill_cycles rc ON rc.program_id = cp.id AND rc.period = $1
     WHERE cp.status = 'active'
       AND (rc.id IS NULL OR rc.status NOT IN ('dispensed','cancelled'))`,
    [period]
  ).catch(() => ({ rows: [{ n: '0' }] }));

  const o = ota.rows[0];

  return {
    active_programs: Number(active.rows[0]?.n || 0),
    by_stage: Object.fromEntries(stages.rows.map((r) => [r.stage, Number(r.n)])),
    by_risk: Object.fromEntries(risk.rows.map((r) => [r.risk_band, Number(r.n)])),
    adherence_reviews_due_7d: Number(plansDue.rows[0]?.n || 0),
    open_adverse_events: Number(openAe.rows[0]?.n || 0),
    period,
    due_refills_period: Number(dueRefills.rows[0]?.n || 0),
    ota: {
      programs_with_first_dispense: Number(o?.with_dispense || 0),
      avg_days_to_first_dispense: o?.avg_days != null ? Number(o.avg_days) : null,
      median_days_to_first_dispense:
        o?.median_days != null ? Math.round(Number(o.median_days) * 10) / 10 : null,
      first_dispense_within_7_days: Number(o?.under_7_days || 0),
    },
  };
}
