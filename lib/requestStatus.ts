import { query } from '@/lib/db';

export type PipelineStage =
  | 'enrolled'
  | 'awaiting_refill'
  | 'in_review'
  | 'approved'
  | 'partially_approved'
  | 'dispensing'
  | 'dispensed'
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'cancelled';

export type RequestStatusRow = {
  program_id: string;
  program_code: string;
  program_status: string;
  employee_id: string;
  employee_name: string;
  patient_name: string;
  relation: string;
  med_count: number;
  period: string | null;
  cycle_id: string | null;
  cycle_status: string | null;
  claim_id: string | null;
  stage: PipelineStage;
  stage_label_ar: string;
  requested_at: string | null;
  reviewed_at: string | null;
  dispensed_at: string | null;
  estimated_total_egp: number | null;
  approved_total_egp: number | null;
};

function stageLabel(stage: PipelineStage): string {
  const map: Record<PipelineStage, string> = {
    enrolled: 'مسجّل',
    awaiting_refill: 'بانتظار دورة صرف',
    in_review: 'قيد المراجعة',
    approved: 'معتمد',
    partially_approved: 'اعتماد جزئي',
    dispensing: 'قيد الصرف',
    dispensed: 'مصروف',
    rejected: 'مرفوض',
    suspended: 'موقوف',
    expired: 'منتهي',
    cancelled: 'ملغى',
  };
  return map[stage] || stage;
}

function resolveStage(
  programStatus: string,
  cycleStatus: string | null
): PipelineStage {
  if (programStatus === 'suspended') return 'suspended';
  if (programStatus === 'expired') return 'expired';
  if (programStatus === 'cancelled') return 'cancelled';
  if (!cycleStatus) {
    return programStatus === 'active' ? 'awaiting_refill' : 'enrolled';
  }
  switch (cycleStatus) {
    case 'in_review':
    case 'submitted':
    case 'draft':
      return 'in_review';
    case 'approved':
      return 'approved';
    case 'partially_approved':
      return 'partially_approved';
    case 'dispensing':
      return 'dispensing';
    case 'dispensed':
      return 'dispensed';
    case 'rejected':
      return 'rejected';
    default:
      return 'awaiting_refill';
  }
}

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * List chronic programs with latest / period-specific refill status.
 */
export async function listRequestStatuses(opts: {
  period?: string;
  stage?: string;
  q?: string;
  limit?: number;
}): Promise<{ period: string; count: number; rows: RequestStatusRow[] }> {
  const period = opts.period || defaultPeriod();
  const limit = Math.min(opts.limit ?? 200, 500);
  const params: unknown[] = [period];
  const where: string[] = [`cp.status IN ('active','suspended','expired','cancelled')`];

  if (opts.q) {
    params.push(`%${opts.q}%`);
    const i = params.length;
    where.push(
      `(e.full_name ILIKE $${i} OR d.full_name ILIKE $${i} OR e.external_employee_id ILIKE $${i} OR cp.program_code ILIKE $${i})`
    );
  }

  params.push(limit);
  const limitIdx = params.length;

  const res = await query(
    `SELECT
       cp.id AS program_id,
       cp.program_code,
       cp.status AS program_status,
       e.external_employee_id AS employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation,
       (SELECT count(*)::int FROM chronic_med_lines ml
         WHERE ml.program_id = cp.id AND ml.is_active) AS med_count,
       rc.id AS cycle_id,
       rc.status AS cycle_status,
       rc.external_claim_id AS claim_id,
       rc.requested_at,
       rc.reviewed_at,
       rc.dispensed_at,
       rc.estimated_total_egp,
       rc.approved_total_egp
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     LEFT JOIN refill_cycles rc
       ON rc.program_id = cp.id AND rc.period = $1
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE COALESCE(rc.status::text, '')
         WHEN 'in_review' THEN 1
         WHEN 'approved' THEN 2
         WHEN 'partially_approved' THEN 3
         WHEN 'dispensing' THEN 4
         WHEN 'dispensed' THEN 5
         WHEN 'rejected' THEN 6
         ELSE 7
       END,
       e.full_name,
       d.full_name
     LIMIT $${limitIdx}`,
    params
  );

  let rows: RequestStatusRow[] = (res.rows as any[]).map((r) => {
    const stage = resolveStage(r.program_status, r.cycle_status);
    return {
      program_id: r.program_id,
      program_code: r.program_code,
      program_status: r.program_status,
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      patient_name: r.patient_name,
      relation: r.relation,
      med_count: Number(r.med_count) || 0,
      period,
      cycle_id: r.cycle_id,
      cycle_status: r.cycle_status,
      claim_id: r.claim_id,
      stage,
      stage_label_ar: stageLabel(stage),
      requested_at: r.requested_at,
      reviewed_at: r.reviewed_at,
      dispensed_at: r.dispensed_at,
      estimated_total_egp:
        r.estimated_total_egp != null ? Number(r.estimated_total_egp) : null,
      approved_total_egp:
        r.approved_total_egp != null ? Number(r.approved_total_egp) : null,
    };
  });

  if (opts.stage) {
    rows = rows.filter((r) => r.stage === opts.stage);
  }

  return { period, count: rows.length, rows };
}

export async function requestStatusSummary(period?: string) {
  const { rows, period: p } = await listRequestStatuses({
    period,
    limit: 500,
  });
  const byStage: Record<string, number> = {};
  for (const r of rows) {
    byStage[r.stage] = (byStage[r.stage] || 0) + 1;
  }
  return {
    period: p,
    total: rows.length,
    by_stage: byStage,
  };
}
