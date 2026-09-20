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

export type MedicationsReport = {
  generated_at: string;
  summary: {
    active_programs: number;
    active_med_lines: number;
    unique_drugs: number;
    eva_preferred: number;
    not_in_eva: number;
  };
  by_formulary: Array<{ formulary_flag: string; lines: number; programs: number }>;
  catalog: Array<{
    drug_name: string;
    programs: number;
    total_qty_per_cycle: number;
    formulary_flag: string;
    company_preferred: boolean;
  }>;
  program_lines: Array<{
    program_code: string;
    employee_name: string;
    patient_name: string;
    line_code: string;
    requested_name: string;
    matched_name: string | null;
    qty_per_cycle: number;
    formulary_flag: string | null;
    company_preferred: boolean;
  }>;
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

  return toCsv(
    headers,
    (items.rows as any[]).map((r) => [
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
    ])
  );
}

/** Active chronic medication formulary across all programs */
export async function buildMedicationsReport(): Promise<MedicationsReport> {
  const summaryRes = await query<{
    active_programs: string;
    active_med_lines: string;
    unique_drugs: string;
    eva_preferred: string;
    not_in_eva: string;
  }>(
    `SELECT
       (SELECT count(*)::text FROM chronic_programs WHERE status = 'active') AS active_programs,
       (SELECT count(*)::text FROM chronic_med_lines WHERE is_active) AS active_med_lines,
       (SELECT count(DISTINCT lower(trim(coalesce(matched_name, requested_name))))::text
          FROM chronic_med_lines WHERE is_active) AS unique_drugs,
       (SELECT count(*)::text FROM chronic_med_lines
          WHERE is_active AND formulary_flag ILIKE '%EVA%') AS eva_preferred,
       (SELECT count(*)::text FROM chronic_med_lines
          WHERE is_active AND (formulary_flag IS NULL OR formulary_flag NOT ILIKE '%EVA%' OR formulary_flag ILIKE '%NOT%')) AS not_in_eva`
  );

  const byForm = await query<{ formulary_flag: string; lines: string; programs: string }>(
    `SELECT coalesce(nullif(trim(formulary_flag), ''), 'UNSET') AS formulary_flag,
            count(*)::text AS lines,
            count(DISTINCT program_id)::text AS programs
     FROM chronic_med_lines
     WHERE is_active
     GROUP BY 1
     ORDER BY count(*) DESC`
  );

  const catalog = await query<{
    drug_name: string;
    programs: string;
    total_qty: string;
    formulary_flag: string;
    company_preferred: boolean;
  }>(
    `SELECT coalesce(nullif(trim(matched_name), ''), requested_name) AS drug_name,
            count(DISTINCT program_id)::text AS programs,
            coalesce(sum(qty_per_cycle), 0)::text AS total_qty,
            max(coalesce(formulary_flag, '')) AS formulary_flag,
            bool_or(company_preferred) AS company_preferred
     FROM chronic_med_lines
     WHERE is_active
     GROUP BY 1
     ORDER BY count(DISTINCT program_id) DESC, 1`
  );

  const lines = await query(
    `SELECT
       cp.program_code,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       m.line_code,
       m.requested_name,
       m.matched_name,
       m.qty_per_cycle,
       m.formulary_flag,
       m.company_preferred
     FROM chronic_med_lines m
     JOIN chronic_programs cp ON cp.id = m.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE m.is_active AND cp.status = 'active'
     ORDER BY cp.program_code, m.line_code`
  );

  const s = summaryRes.rows[0];

  return {
    generated_at: new Date().toISOString(),
    summary: {
      active_programs: Number(s?.active_programs) || 0,
      active_med_lines: Number(s?.active_med_lines) || 0,
      unique_drugs: Number(s?.unique_drugs) || 0,
      eva_preferred: Number(s?.eva_preferred) || 0,
      not_in_eva: Number(s?.not_in_eva) || 0,
    },
    by_formulary: byForm.rows.map((r) => ({
      formulary_flag: r.formulary_flag,
      lines: Number(r.lines) || 0,
      programs: Number(r.programs) || 0,
    })),
    catalog: catalog.rows.map((r) => ({
      drug_name: r.drug_name,
      programs: Number(r.programs) || 0,
      total_qty_per_cycle: Number(r.total_qty) || 0,
      formulary_flag: r.formulary_flag || 'UNSET',
      company_preferred: !!r.company_preferred,
    })),
    program_lines: (lines.rows as any[]).map((r) => ({
      program_code: r.program_code,
      employee_name: r.employee_name,
      patient_name: r.patient_name,
      line_code: r.line_code,
      requested_name: r.requested_name,
      matched_name: r.matched_name,
      qty_per_cycle: Number(r.qty_per_cycle) || 0,
      formulary_flag: r.formulary_flag,
      company_preferred: !!r.company_preferred,
    })),
  };
}

export async function buildMedicationsCsv(): Promise<string> {
  const report = await buildMedicationsReport();
  const headers = [
    'program_code',
    'employee_name',
    'patient_name',
    'line_code',
    'requested_name',
    'matched_name',
    'qty_per_cycle',
    'formulary_flag',
    'company_preferred',
  ];
  return toCsv(
    headers,
    report.program_lines.map((r) => [
      r.program_code,
      r.employee_name,
      r.patient_name,
      r.line_code,
      r.requested_name,
      r.matched_name,
      r.qty_per_cycle,
      r.formulary_flag,
      r.company_preferred,
    ])
  );
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}
