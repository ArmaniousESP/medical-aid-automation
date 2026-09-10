import { query } from '@/lib/db';

export type GenerateResult = {
  period: string;
  created: number;
  skipped: number;
  cycles: Array<{
    program_code: string;
    cycle_id: string;
    items: number;
    estimated_total_egp: number | null;
  }>;
};

function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/**
 * Generate monthly refill cycles for all active chronic programs.
 * Idempotent per (program_id, period).
 */
export async function generateRefills(period: string): Promise<GenerateResult> {
  if (!isValidPeriod(period)) {
    throw new Error('period must be YYYY-MM');
  }

  const programs = await query<{
    id: string;
    program_code: string;
  }>(
    `SELECT id, program_code FROM chronic_programs
     WHERE status = 'active'
       AND start_date <= (date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date
       AND (end_date IS NULL OR end_date >= $1::date)`,
    [`${period}-01`]
  );

  const result: GenerateResult = {
    period,
    created: 0,
    skipped: 0,
    cycles: [],
  };

  for (const prog of programs.rows) {
    const existing = await query(
      `SELECT id FROM refill_cycles WHERE program_id = $1 AND period = $2`,
      [prog.id, period]
    );
    if (existing.rows.length > 0) {
      result.skipped += 1;
      continue;
    }

    const claimId = `AID-${period.replace('-', '')}-${prog.program_code}`;

    const cycleIns = await query<{ id: string }>(
      `INSERT INTO refill_cycles (
         program_id, period, status, requested_at, external_claim_id, fulfillment_channel
       ) VALUES ($1, $2, 'in_review', now(), $3, 'internal')
       RETURNING id`,
      [prog.id, period, claimId]
    );
    const cycleId = cycleIns.rows[0].id;

    const lines = await query<{
      id: string;
      line_code: string;
      matched_name: string | null;
      requested_name: string;
      qty_per_cycle: string;
      days_supply: number;
      formulary_flag: string | null;
      company_preferred: boolean;
    }>(
      `SELECT id, line_code, matched_name, requested_name, qty_per_cycle, days_supply,
              formulary_flag, company_preferred
       FROM chronic_med_lines
       WHERE program_id = $1 AND is_active = true
       ORDER BY line_code`,
      [prog.id]
    );

    let estimated = 0;
    for (const line of lines.rows) {
      const qty = Number(line.qty_per_cycle) || 1;
      const drugName = line.matched_name || line.requested_name;
      // Price left null until pricing engine is wired; total stays null-safe
      await query(
        `INSERT INTO refill_items (
           refill_cycle_id, med_line_id, line_code, drug_name, qty, days_supply,
           unit_price_egp, line_total_egp, formulary_flag, company_preferred, status
         ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, $7, $8, 'pending')`,
        [
          cycleId,
          line.id,
          line.line_code,
          drugName,
          qty,
          line.days_supply,
          line.formulary_flag,
          line.company_preferred,
        ]
      );
      estimated += 0;
    }

    await query(
      `UPDATE refill_cycles SET estimated_total_egp = $1, updated_at = now() WHERE id = $2`,
      [estimated || null, cycleId]
    );

    result.created += 1;
    result.cycles.push({
      program_code: prog.program_code,
      cycle_id: cycleId,
      items: lines.rows.length,
      estimated_total_egp: estimated || null,
    });
  }

  return result;
}

export async function listRefills(opts: {
  status?: string;
  period?: string;
  limit?: number;
}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const params: unknown[] = [];
  const where: string[] = [];

  if (opts.status) {
    params.push(opts.status);
    where.push(`rc.status = $${params.length}`);
  }
  if (opts.period) {
    params.push(opts.period);
    where.push(`rc.period = $${params.length}`);
  }

  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const res = await query(
    `SELECT
       rc.id,
       rc.period,
       rc.status,
       rc.estimated_total_egp,
       rc.approved_total_egp,
       rc.external_claim_id,
       rc.requested_at,
       cp.program_code,
       e.external_employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation,
       (SELECT count(*)::int FROM refill_items ri WHERE ri.refill_cycle_id = rc.id) AS item_count
     FROM refill_cycles rc
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     ${whereSql}
     ORDER BY rc.period DESC, cp.program_code
     LIMIT $${params.length}`,
    params
  );

  return res.rows;
}

export async function getRefillDetail(cycleId: string) {
  const cycle = await query(
    `SELECT
       rc.*,
       cp.program_code,
       e.external_employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation
     FROM refill_cycles rc
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE rc.id = $1`,
    [cycleId]
  );
  if (!cycle.rows[0]) return null;

  const items = await query(
    `SELECT * FROM refill_items WHERE refill_cycle_id = $1 ORDER BY line_code`,
    [cycleId]
  );

  return { cycle: cycle.rows[0], items: items.rows };
}

export async function decideItem(input: {
  cycleId: string;
  itemId: string;
  decision: 'approved' | 'rejected' | 'skipped';
  approved_qty?: number;
  approved_amount_egp?: number;
  rejection_reason?: string;
  reviewed_by?: string;
}) {
  const statusMap = {
    approved: 'approved',
    rejected: 'rejected',
    skipped: 'skipped',
  } as const;

  await query(
    `UPDATE refill_items SET
       status = $1,
       approved_qty = $2,
       approved_amount_egp = $3,
       rejection_reason = $4,
       updated_at = now()
     WHERE id = $5 AND refill_cycle_id = $6`,
    [
      statusMap[input.decision],
      input.decision === 'approved' ? input.approved_qty ?? null : null,
      input.decision === 'approved' ? input.approved_amount_egp ?? null : null,
      input.decision === 'rejected' ? input.rejection_reason ?? null : null,
      input.itemId,
      input.cycleId,
    ]
  );

  // Recalculate cycle status from items
  const items = await query<{ status: string; approved_amount_egp: string | null }>(
    `SELECT status, approved_amount_egp FROM refill_items WHERE refill_cycle_id = $1`,
    [input.cycleId]
  );

  const statuses = items.rows.map((r) => r.status);
  const allDecided = statuses.every((s) => s !== 'pending');
  let cycleStatus = 'in_review';
  if (allDecided) {
    const hasApproved = statuses.some((s) => s === 'approved' || s === 'dispensed');
    const hasRejected = statuses.some((s) => s === 'rejected');
    if (hasApproved && hasRejected) cycleStatus = 'partially_approved';
    else if (hasApproved) cycleStatus = 'approved';
    else cycleStatus = 'rejected';
  }

  const approvedTotal = items.rows
    .filter((r) => r.status === 'approved' || r.status === 'dispensed')
    .reduce((s, r) => s + (Number(r.approved_amount_egp) || 0), 0);

  await query(
    `UPDATE refill_cycles SET
       status = $1::refill_status,
       approved_total_egp = $2,
       reviewed_at = now(),
       reviewed_by = COALESCE($3, reviewed_by),
       approved_at = CASE WHEN $1 IN ('approved', 'partially_approved') THEN now() ELSE approved_at END,
       updated_at = now()
     WHERE id = $4`,
    [cycleStatus, approvedTotal || null, input.reviewed_by ?? null, input.cycleId]
  );

  return getRefillDetail(input.cycleId);
}
