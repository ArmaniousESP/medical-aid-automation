import { query } from '@/lib/db';

export type MonthlyReport = {
  period: string;
  summary: {
    cycles: number;
    by_status: Record<string, number>;
    items_pending: number;
    items_approved: number;
    items_rejected: number;
    items_dispensed: number;
    estimated_total_egp: number;
    approved_total_egp: number;
  };
  cycles: Array<Record<string, unknown>>;
  top_meds: Array<{ drug_name: string; lines: number; qty: number }>;
};

export async function buildMonthlyReport(period: string): Promise<MonthlyReport> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error('period must be YYYY-MM');
  }

  const cyclesRes = await query(
    `SELECT
       rc.id,
       rc.period,
       rc.status,
       rc.estimated_total_egp,
       rc.approved_total_egp,
       rc.external_claim_id,
       rc.requested_at,
       rc.reviewed_at,
       rc.dispensed_at,
       rc.reviewed_by,
       cp.program_code,
       e.external_employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation
     FROM refill_cycles rc
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE rc.period = $1
     ORDER BY cp.program_code`,
    [period]
  );

  const byStatus: Record<string, number> = {};
  let estimated = 0;
  let approved = 0;
  for (const row of cyclesRes.rows as any[]) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    estimated += Number(row.estimated_total_egp) || 0;
    approved += Number(row.approved_total_egp) || 0;
  }

  const itemsRes = await query<{ status: string; c: string }>(
    `SELECT ri.status, count(*)::text AS c
     FROM refill_items ri
     JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
     WHERE rc.period = $1
     GROUP BY ri.status`,
    [period]
  );

  const itemCounts: Record<string, number> = {};
  for (const r of itemsRes.rows) {
    itemCounts[r.status] = Number(r.c) || 0;
  }

  const topMeds = await query<{ drug_name: string; lines: string; qty: string }>(
    `SELECT ri.drug_name,
            count(*)::text AS lines,
            coalesce(sum(ri.qty), 0)::text AS qty
     FROM refill_items ri
     JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
     WHERE rc.period = $1
     GROUP BY ri.drug_name
     ORDER BY count(*) DESC
     LIMIT 20`,
    [period]
  );

  return {
    period,
    summary: {
      cycles: cyclesRes.rows.length,
      by_status: byStatus,
      items_pending: itemCounts.pending || 0,
      items_approved: itemCounts.approved || 0,
      items_rejected: itemCounts.rejected || 0,
      items_dispensed: itemCounts.dispensed || 0,
      estimated_total_egp: Math.round(estimated * 100) / 100,
      approved_total_egp: Math.round(approved * 100) / 100,
    },
    cycles: cyclesRes.rows as any,
    top_meds: topMeds.rows.map((r) => ({
      drug_name: r.drug_name,
      lines: Number(r.lines) || 0,
      qty: Number(r.qty) || 0,
    })),
  };
}

export async function buildMonthlyCsv(period: string): Promise<string> {
  const items = await query(
    `SELECT
       rc.period,
       cp.program_code,
       e.external_employee_id,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       d.relation,
       rc.status AS cycle_status,
       ri.line_code,
       ri.drug_name,
       ri.qty,
       ri.unit_price_egp,
       ri.line_total_egp,
       ri.price_source,
       ri.formulary_flag,
       ri.company_preferred,
       ri.status AS item_status,
       ri.approved_qty,
       ri.approved_amount_egp,
       ri.rejection_reason,
       ri.dispensed_qty,
       rc.external_claim_id
     FROM refill_items ri
     JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE rc.period = $1
     ORDER BY cp.program_code, ri.line_code`,
    [period]
  );

  const headers = [
    'period',
    'program_code',
    'employee_id',
    'employee_name',
    'patient_name',
    'relation',
    'cycle_status',
    'line_code',
    'drug_name',
    'qty',
    'unit_price_egp',
    'line_total_egp',
    'price_source',
    'formulary_flag',
    'company_preferred',
    'item_status',
    'approved_qty',
    'approved_amount_egp',
    'rejection_reason',
    'dispensed_qty',
    'claim_id',
  ];

  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of items.rows as any[]) {
    lines.push(
      [
        r.period,
        r.program_code,
        r.external_employee_id,
        r.employee_name,
        r.patient_name,
        r.relation,
        r.cycle_status,
        r.line_code,
        r.drug_name,
        r.qty,
        r.unit_price_egp,
        r.line_total_egp,
        r.price_source,
        r.formulary_flag,
        r.company_preferred,
        r.item_status,
        r.approved_qty,
        r.approved_amount_egp,
        r.rejection_reason,
        r.dispensed_qty,
        r.external_claim_id,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}
