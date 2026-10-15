import { query } from '@/lib/db';

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
 * Flat pick-list for pharmacy.
 * formulary: 'EVA' | 'NOT_EVA' filters lines.
 */
export async function buildPharmacyPickList(opts: {
  period?: string;
  status?: string;
  includePending?: boolean;
  formulary?: 'EVA' | 'NOT_EVA' | 'all';
  org_ids?: string[];
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

  if (opts.formulary === 'EVA') {
    where.push(
      `(ri.company_preferred = true OR coalesce(ri.formulary_flag,'') ILIKE '%EVA%' AND coalesce(ri.formulary_flag,'') NOT ILIKE '%NOT%')`
    );
  } else if (opts.formulary === 'NOT_EVA') {
    where.push(
      `(ri.company_preferred = false AND (ri.formulary_flag IS NULL OR ri.formulary_flag NOT ILIKE '%EVA%' OR ri.formulary_flag ILIKE '%NOT%'))`
    );
  }

  if (opts.org_ids !== undefined) {
    if (!opts.org_ids.length) return [];
    params.push(opts.org_ids);
    where.push(`e.org_id = ANY($${params.length}::uuid[])`);
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
