import { query } from '@/lib/db';
import { resolveUnitPriceWithExternal } from '@/lib/pricing';
import { loadMedDb } from '@/lib/meddb';
import type { MedEntry } from '@/lib/matching';
import { applyDispenseToInventory } from '@/lib/inventory';
import { recordFirstDispense } from '@/lib/pspOps';
import { sendWhatsApp } from '@/lib/whatsapp';
import { syncDispenseToDhis2 } from '@/lib/dhis2';

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

export async function generateRefillCycles(period: string): Promise<GenerateResult> {
  if (!isValidPeriod(period)) {
    throw new Error('period must be YYYY-MM');
  }

  const medDb = await loadMedDb();
  const programs = await query<{ id: string; program_code: string }>(
    `SELECT id, program_code FROM chronic_programs WHERE status = 'active'`
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
    const existing = await query<{ id: string }>(
      `SELECT id FROM refill_cycles WHERE program_id = $1 AND period = $2 LIMIT 1`,
      [prog.id, period]
    );
    if (existing.rows[0]) {
      result.skipped += 1;
      continue;
    }

    const lines = await query<{
      id: string;
      line_code: string;
      matched_name: string | null;
      requested_name: string;
      qty_per_cycle: number;
      days_supply: number | null;
      formulary_flag: string | null;
      company_preferred: boolean | null;
    }>(
      `SELECT id, line_code, matched_name, requested_name, qty_per_cycle, days_supply,
              formulary_flag, company_preferred
       FROM chronic_med_lines WHERE program_id = $1 AND is_active = true
       ORDER BY line_code`,
      [prog.id]
    );

    if (!lines.rows.length) {
      result.emptySkipped += 1;
      continue;
    }

    const ins = await query<{ id: string }>(
      `INSERT INTO refill_cycles (program_id, period, status)
       VALUES ($1, $2, 'in_review')
       RETURNING id`,
      [prog.id, period]
    );
    const cycleId = ins.rows[0].id;
    let estimated = 0;

    for (const line of lines.rows) {
      const drugName = line.matched_name || line.requested_name;
      const qty = Number(line.qty_per_cycle) || 1;
      let unitPrice: number | null = null;
      let priceSource = 'none';
      try {
        const resolved = await resolveUnitPriceWithExternal(drugName, medDb as MedEntry[]);
        unitPrice = resolved.unitPrice;
        priceSource = resolved.source;
      } catch {
        /* */
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

export async function listRefills(opts?: {
  period?: string;
  status?: string;
  limit?: number;
  q?: string;
}) {
  const limit = Math.min(opts?.limit ?? 100, 500);
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts?.period) {
    params.push(opts.period);
    where.push(`rc.period = $${params.length}`);
  }
  if (opts?.status) {
    params.push(opts.status);
    where.push(`rc.status = $${params.length}`);
  }
  if (opts?.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(
      `(cp.program_code ILIKE $${params.length} OR e.full_name ILIKE $${params.length} OR d.full_name ILIKE $${params.length})`
    );
  }
  params.push(limit);
  const sql = `
    SELECT rc.*, cp.program_code,
           e.full_name AS employee_name, d.full_name AS patient_name,
           (SELECT count(*)::int FROM refill_items ri WHERE ri.refill_cycle_id = rc.id) AS item_count
    FROM refill_cycles rc
    JOIN chronic_programs cp ON cp.id = rc.program_id
    JOIN employees e ON e.id = cp.employee_id
    JOIN dependents d ON d.id = cp.dependent_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY rc.period DESC, rc.created_at DESC
    LIMIT $${params.length}`;
  const r = await query(sql, params);
  return r.rows;
}

export async function getRefillDetail(cycleId: string) {
  const cycle = await query(
    `SELECT rc.*, cp.program_code, e.full_name AS employee_name, d.full_name AS patient_name
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

export async function updateRefillItem(input: {
  cycleId: string;
  itemId: string;
  status?: string;
  approved_qty?: number;
  actor?: string;
}) {
  const row = await query<{ qty: string; line_total_egp: string | null }>(
    `SELECT qty, line_total_egp FROM refill_items WHERE id = $1 AND refill_cycle_id = $2`,
    [input.itemId, input.cycleId]
  );
  if (!row.rows[0]) throw new Error('Item not found');
  const qty = Number(row.rows[0].qty) || 1;
  const approved =
    input.approved_qty != null
      ? input.approved_qty
      : input.status === 'approved'
        ? qty
        : null;
  await query(
    `UPDATE refill_items SET
       status = COALESCE($3, status),
       approved_qty = COALESCE($4, approved_qty),
       updated_at = now()
     WHERE id = $1 AND refill_cycle_id = $2`,
    [input.itemId, input.cycleId, input.status ?? null, approved]
  );
  return getRefillDetail(input.cycleId);
}

export async function approveAllPending(cycleId: string, actor?: string) {
  await query(
    `UPDATE refill_items SET
       status = 'approved',
       approved_qty = qty,
       updated_at = now()
     WHERE refill_cycle_id = $1 AND status = 'pending'`,
    [cycleId]
  );
  await query(
    `UPDATE refill_cycles SET status = 'approved', updated_at = now() WHERE id = $1`,
    [cycleId]
  );
  if (actor) {
    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor)
       VALUES ('refill_cycle', $1, 'approved', $2)`,
      [cycleId, actor]
    );
  }
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

  try {
    await recordFirstDispense(cycle.rows[0].program_id);
  } catch (e) {
    console.error('recordFirstDispense failed', e);
  }

  try {
    await applyDispenseToInventory(input.cycleId, input.actor);
  } catch (e) {
    console.error('inventory deduct failed', e);
  }

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

  try {
    const meta = await query<{
      program_id: string;
      program_code: string | null;
      period: string | null;
      emp_name: string | null;
      emp_id: string | null;
      patient_name: string | null;
      phone: string | null;
      meds: string | null;
    }>(
      `SELECT cp.id AS program_id, cp.program_code, rc.period,
              e.full_name AS emp_name, e.external_employee_id AS emp_id,
              d.full_name AS patient_name, e.phone,
              (
                SELECT string_agg(
                  ri.drug_name || '×' ||
                  coalesce(ri.dispensed_qty, ri.approved_qty, ri.qty)::text,
                  '; '
                )
                FROM refill_items ri WHERE ri.refill_cycle_id = rc.id
              ) AS meds
       FROM refill_cycles rc
       JOIN chronic_programs cp ON cp.id = rc.program_id
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE rc.id = $1`,
      [input.cycleId]
    );
    const row = meta.rows[0];
    if (row) {
      await syncDispenseToDhis2({
        program_id: row.program_id,
        program_code: row.program_code || undefined,
        emp_name: row.emp_name || undefined,
        emp_id: row.emp_id || undefined,
        patient_name: row.patient_name || undefined,
        phone: row.phone || undefined,
        period: row.period || undefined,
        med_summary: row.meds || undefined,
      });
    }
  } catch (e) {
    console.error('dhis2 dispense sync failed', e);
  }

  return getRefillDetail(input.cycleId);
}
