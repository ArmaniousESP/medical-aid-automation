import { query } from '@/lib/db';
import { approveAllPending, dispenseCycle, listRefills } from '@/lib/refills';

export type PharmacyLine = {
  cycle_id: string;
  claim_id: string | null;
  period: string;
  cycle_status: string;
  program_code: string;
  employee_id: string;
  employee_name: string;
  patient_name: string;
  relation: string;
  line_code: string;
  drug_name: string;
  qty: number;
  days_supply: number | null;
  formulary_flag: string | null;
  company_preferred: boolean;
  item_status: string;
  approved_qty: number | null;
  dispensed_qty: number | null;
};

/**
 * Flat pick-list for pharmacy: items on cycles in approved / partially_approved / dispensed
 * (or in_review if includePending).
 */
export async function buildPharmacyPickList(opts: {
  period?: string;
  status?: string;
  includePending?: boolean;
}): Promise<PharmacyLine[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (opts.period) {
    params.push(opts.period);
    where.push(`rc.period = $${params.length}`);
  }

  if (opts.status) {
    params.push(opts.status);
    where.push(`rc.status = $${params.length}`);
  } else if (!opts.includePending) {
    where.push(
      `rc.status IN ('approved', 'partially_approved', 'dispensing', 'dispensed')`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const res = await query(
    `SELECT
       rc.id AS cycle_id,
       rc.external_claim_id AS claim_id,
       rc.period,
       rc.status AS cycle_status,
       cp.program_code,
       e.external_employee_id AS employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation,
       ri.line_code,
       ri.drug_name,
       ri.qty,
       ri.days_supply,
       ri.formulary_flag,
       ri.company_preferred,
       ri.status AS item_status,
       ri.approved_qty,
       ri.dispensed_qty
     FROM refill_items ri
     JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     ${whereSql}
     ORDER BY rc.period DESC, cp.program_code, ri.line_code`,
    params
  );

  return (res.rows as any[]).map((r) => ({
    cycle_id: r.cycle_id,
    claim_id: r.claim_id,
    period: r.period,
    cycle_status: r.cycle_status,
    program_code: r.program_code,
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    patient_name: r.patient_name,
    relation: r.relation,
    line_code: r.line_code,
    drug_name: r.drug_name,
    qty: Number(r.qty) || 0,
    days_supply: r.days_supply != null ? Number(r.days_supply) : null,
    formulary_flag: r.formulary_flag,
    company_preferred: !!r.company_preferred,
    item_status: r.item_status,
    approved_qty: r.approved_qty != null ? Number(r.approved_qty) : null,
    dispensed_qty: r.dispensed_qty != null ? Number(r.dispensed_qty) : null,
  }));
}

export function pharmacyPickListCsv(lines: PharmacyLine[]): string {
  const headers = [
    'period',
    'claim_id',
    'program_code',
    'employee_id',
    'employee_name',
    'patient_name',
    'relation',
    'cycle_status',
    'line_code',
    'drug_name',
    'qty',
    'days_supply',
    'formulary_flag',
    'company_preferred',
    'item_status',
    'approved_qty',
    'dispensed_qty',
  ];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = [headers.join(',')];
  for (const r of lines) {
    rows.push(
      [
        r.period,
        r.claim_id,
        r.program_code,
        r.employee_id,
        r.employee_name,
        r.patient_name,
        r.relation,
        r.cycle_status,
        r.line_code,
        r.drug_name,
        r.qty,
        r.days_supply,
        r.formulary_flag,
        r.company_preferred,
        r.item_status,
        r.approved_qty,
        r.dispensed_qty,
      ]
        .map(escape)
        .join(',')
    );
  }
  return rows.join('\n');
}

/**
 * Approve all pending items then dispense for every matching cycle.
 * Default: all in_review / approved / partially_approved for period.
 */
export async function processPharmacyBatch(opts: {
  period?: string;
  cycleIds?: string[];
  actor?: string;
  notes?: string;
}) {
  const actor = opts.actor || 'pharmacy-batch';
  const notes = opts.notes || 'صرف صيدلية — دفعة تلقائية';

  let cycleIds = opts.cycleIds;
  if (!cycleIds || cycleIds.length === 0) {
    const rows = await listRefills({
      period: opts.period,
      limit: 200,
    });
    cycleIds = (rows as any[])
      .filter((r) =>
        ['in_review', 'approved', 'partially_approved', 'dispensing'].includes(
          r.status
        )
      )
      .map((r) => r.id as string);
  }

  const results: Array<{
    cycle_id: string;
    ok: boolean;
    status?: string;
    error?: string;
  }> = [];

  for (const id of cycleIds) {
    try {
      const detail = await query<{ status: string }>(
        `SELECT status FROM refill_cycles WHERE id = $1`,
        [id]
      );
      const st = detail.rows[0]?.status;
      if (!st) {
        results.push({ cycle_id: id, ok: false, error: 'not found' });
        continue;
      }

      if (st === 'in_review') {
        await approveAllPending(id, actor);
      }

      const after = await query<{ status: string }>(
        `SELECT status FROM refill_cycles WHERE id = $1`,
        [id]
      );
      const st2 = after.rows[0]?.status;

      if (['approved', 'partially_approved', 'dispensing'].includes(st2 || '')) {
        await dispenseCycle({ cycleId: id, notes, actor });
        results.push({ cycle_id: id, ok: true, status: 'dispensed' });
      } else if (st2 === 'dispensed') {
        results.push({ cycle_id: id, ok: true, status: 'already_dispensed' });
      } else {
        results.push({
          cycle_id: id,
          ok: false,
          status: st2,
          error: `cannot dispense from ${st2}`,
        });
      }
    } catch (e: unknown) {
      results.push({
        cycle_id: id,
        ok: false,
        error: e instanceof Error ? e.message : 'failed',
      });
    }
  }

  return {
    processed: results.length,
    ok_count: results.filter((r) => r.ok).length,
    results,
  };
}
