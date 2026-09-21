import { query } from '@/lib/db';
import { resolveUnitPriceWithExternal } from '@/lib/pricing';
import { loadMedDb } from '@/lib/meddb';
import type { MedEntry } from '@/lib/matching';
import { applyDispenseToInventory } from '@/lib/inventory';
import { recordFirstDispense } from '@/lib/pspOps';
import { sendWhatsApp } from '@/lib/whatsapp';

export type GenerateResult = {
  period: string;
  created: number;
  skipped: number;
  emptySkipped: number;
  medDbSize: number;
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
 * Only active med lines; skips programs with zero active lines.
 */
export async function generateRefills(period: string): Promise<GenerateResult> {
  if (!isValidPeriod(period)) {
    throw new Error('period must be YYYY-MM');
  }

  const medDb: MedEntry[] = await loadMedDb();

  const programs = await query<{ id: string; program_code: string }>(
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
    emptySkipped: 0,
    medDbSize: medDb.length,
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

    if (lines.rows.length === 0) {
      result.emptySkipped += 1;
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

    let estimated = 0;
    for (const line of lines.rows) {
      const qty = Number(line.qty_per_cycle) || 1;
      const drugName = line.matched_name || line.requested_name;

      let unitPrice: number | null = null;
      let priceSource: string | null = null;
      try {
        const priced = await resolveUnitPriceWithExternal(drugName, medDb);
        unitPrice = priced.unitPrice;
        priceSource = priced.source !== 'none' ? priced.source : null;
      } catch {
        // pricing is best-effort
      }

      const lineTotal =
        unitPrice != null ? Math.round(unitPrice * qty * 100) / 100 : null;
      if (lineTotal != null) estimated += lineTotal;

      await query(
        `INSERT INTO refill_items (
           refill_cycle_id, med_line_id, line_code, drug_name, qty, days_supply,
           unit_price_egp, line_total_egp, price_source, formulary_flag, company_preferred, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
        [
          cycleId,
          line.id,
          line.line_code,
          drugName,
          qty,
          line.days_supply,
          unitPrice,
          lineTotal,
          priceSource,
          line.formulary_flag,
          line.company_preferred,
        ]
      );
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
  const itemRow = await query<{ qty: string; line_total_egp: string | null }>(
    `SELECT qty, line_total_egp FROM refill_items WHERE id = $1 AND refill_cycle_id = $2`,
    [input.itemId, input.cycleId]
  );
  const row = itemRow.rows[0];

  const approvedQty =
    input.decision === 'approved'
      ? input.approved_qty ?? (row ? Number(row.qty) : 1)
      : null;
  const approvedAmount =
    input.decision === 'approved'
      ? input.approved_amount_egp ??
        (row?.line_total_egp != null ? Number(row.line_total_egp) : null)
      : null;

  await query(
    `UPDATE refill_items SET
       status = $1,
       approved_qty = $2,
       approved_amount_egp = $3,
       rejection_reason = $4,
       updated_at = now()
     WHERE id = $5 AND refill_cycle_id = $6`,
    [
      input.decision,
      approvedQty,
      approvedAmount,
      input.decision === 'rejected' ? input.rejection_reason ?? null : null,
      input.itemId,
      input.cycleId,
    ]
  );

  return refreshCycleStatus(input.cycleId, input.reviewed_by);
}

/** Approve every pending item on a cycle (full qty / line total). */
export async function approveAllPending(
  cycleId: string,
  reviewed_by?: string
) {
  await query(
    `UPDATE refill_items SET
       status = 'approved',
       approved_qty = qty,
       approved_amount_egp = line_total_egp,
       rejection_reason = NULL,
       updated_at = now()
     WHERE refill_cycle_id = $1 AND status = 'pending'`,
    [cycleId]
  );
  return refreshCycleStatus(cycleId, reviewed_by);
}

async function refreshCycleStatus(cycleId: string, reviewed_by?: string) {
  const items = await query<{ status: string; approved_amount_egp: string | null }>(
    `SELECT status, approved_amount_egp FROM refill_items WHERE refill_cycle_id = $1`,
    [cycleId]
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
    [cycleStatus, approvedTotal || null, reviewed_by ?? null, cycleId]
  );

  return getRefillDetail(cycleId);
}

export async function dispenseCycle(input: {
  cycleId: string;
  notes?: string;
  actor?: string;
  notify_whatsapp?: boolean;
}) {
  const cycle = await query<{ status: string; program_id: string; external_claim_id: string | null }>(
    `SELECT status, program_id, external_claim_id FROM refill_cycles WHERE id = $1`,
    [input.cycleId]
  );
  if (!cycle.rows[0]) {
    throw new Error('Cycle not found');
  }

  const st = cycle.rows[0].status;
  if (!['approved', 'partially_approved', 'dispensing'].includes(st)) {
    throw new Error(
      `Cannot dispense from status "${st}". Approve items first.`
    );
  }

  await query(
    `UPDATE refill_items SET
       status = 'dispensed',
       dispensed_qty = COALESCE(approved_qty, qty),
       updated_at = now()
     WHERE refill_cycle_id = $1 AND status = 'approved'`,
    [input.cycleId]
  );

  await query(
    `UPDATE refill_cycles SET
       status = 'dispensed',
       dispensed_at = now(),
       fulfillment_notes = COALESCE($2, fulfillment_notes),
       updated_at = now()
     WHERE id = $1`,
    [input.cycleId, input.notes ?? null]
  );

  if (input.actor) {
    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor, to_value)
       VALUES ('refill_cycle', $1, 'dispensed', $2, $3::jsonb)`,
      [
        input.cycleId,
        input.actor,
        JSON.stringify({ notes: input.notes ?? null }),
      ]
    );
  }

  // OTA: first dispense timestamp on program
  try {
    await recordFirstDispense(cycle.rows[0].program_id);
  } catch (e) {
    console.error('recordFirstDispense failed', e);
  }

  // Best-effort stock deduction (idempotent per refill_item)
  try {
    await applyDispenseToInventory(input.cycleId, input.actor);
  } catch (e) {
    console.error('inventory deduct failed', e);
  }

  // Optional pickup notification
  if (input.notify_whatsapp !== false) {
    try {
      const pe = await query<{ phone: string | null; employee_name: string; patient_name: string }>(
        `SELECT e.phone, e.full_name AS employee_name, d.full_name AS patient_name
         FROM chronic_programs cp
         JOIN employees e ON e.id = cp.employee_id
         JOIN dependents d ON d.id = cp.dependent_id
         WHERE cp.id = $1`,
        [cycle.rows[0].program_id]
      );
      const row = pe.rows[0];
      if (row?.phone) {
        await sendWhatsApp({
          to: row.phone,
          template: 'refill_ready',
          program_id: cycle.rows[0].program_id,
          vars: {
            name: row.employee_name,
            patient: row.patient_name,
            claim: cycle.rows[0].external_claim_id || input.cycleId.slice(0, 8),
          },
        });
      }
    } catch (e) {
      console.error('whatsapp refill_ready failed', e);
    }
  }

  return getRefillDetail(input.cycleId);
}
