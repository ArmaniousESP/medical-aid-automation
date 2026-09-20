import { query } from '@/lib/db';
import { CONFIG, AR } from '@/lib/config';

export type EvaSplitRow = {
  company: string;
  employee_name: string;
  employee_id: string;
  patient_name: string;
  relation: string;
  program_code: string;
  line_code: string;
  requested_name: string;
  matched_name: string;
  qty: number;
  formulary_flag: string;
  company_preferred: boolean;
  bucket: 'EVA' | 'NOT_EVA';
};

function isEvaFlag(flag: string | null | undefined, preferred?: boolean): boolean {
  if (preferred) return true;
  const s = String(flag || '').toUpperCase();
  return s.includes('EVA') && !s.includes('NOT');
}

/** Split active med lines from Neon by EVA formulary. */
export async function splitFromDatabase(opts?: {
  bucket?: 'EVA' | 'NOT_EVA' | 'all';
  q?: string;
}): Promise<{ eva: EvaSplitRow[]; not_eva: EvaSplitRow[]; total: number }> {
  const params: unknown[] = [];
  const where = [`ml.is_active = true`, `cp.status = 'active'`];

  if (opts?.q) {
    params.push(`%${opts.q}%`);
    const i = params.length;
    where.push(
      `(e.full_name ILIKE $${i} OR d.full_name ILIKE $${i} OR e.external_employee_id ILIKE $${i} OR ml.matched_name ILIKE $${i} OR ml.requested_name ILIKE $${i})`
    );
  }

  const res = await query(
    `SELECT
       coalesce(e.branch, '') AS company,
       e.full_name AS employee_name,
       e.external_employee_id AS employee_id,
       d.full_name AS patient_name,
       d.relation,
       cp.program_code,
       ml.line_code,
       ml.requested_name,
       coalesce(nullif(trim(ml.matched_name), ''), ml.requested_name) AS matched_name,
       ml.qty_per_cycle AS qty,
       ml.formulary_flag,
       ml.company_preferred
     FROM chronic_med_lines ml
     JOIN chronic_programs cp ON cp.id = ml.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE ${where.join(' AND ')}
     ORDER BY e.full_name, d.full_name, ml.line_code`,
    params
  );

  const eva: EvaSplitRow[] = [];
  const not_eva: EvaSplitRow[] = [];

  for (const r of res.rows as any[]) {
    const bucket: 'EVA' | 'NOT_EVA' = isEvaFlag(
      r.formulary_flag,
      r.company_preferred
    )
      ? 'EVA'
      : 'NOT_EVA';
    const row: EvaSplitRow = {
      company: r.company || '',
      employee_name: r.employee_name,
      employee_id: r.employee_id,
      patient_name: r.patient_name,
      relation: r.relation,
      program_code: r.program_code,
      line_code: r.line_code,
      requested_name: r.requested_name,
      matched_name: r.matched_name,
      qty: Number(r.qty) || 1,
      formulary_flag: r.formulary_flag || (bucket === 'EVA' ? 'EVA_PREFERRED' : 'NOT_IN_EVA'),
      company_preferred: !!r.company_preferred,
      bucket,
    };
    if (bucket === 'EVA') eva.push(row);
    else not_eva.push(row);
  }

  if (opts?.bucket === 'EVA') {
    return { eva, not_eva: [], total: eva.length };
  }
  if (opts?.bucket === 'NOT_EVA') {
    return { eva: [], not_eva, total: not_eva.length };
  }
  return { eva, not_eva, total: eva.length + not_eva.length };
}

/** Split Approved-Requests tab from Google Sheet (when GOOGLE_* configured). */
export async function splitFromSheet(): Promise<{
  eva: EvaSplitRow[];
  not_eva: EvaSplitRow[];
  total: number;
  source: 'sheet';
}> {
  const { getSheetValues, getSpreadsheetIdFromEnv } = await import('@/lib/google');
  const spreadsheetId = await getSpreadsheetIdFromEnv();
  const raw = await getSheetValues(
    spreadsheetId,
    `${CONFIG.APPROVED_SHEET}!A:U`
  );

  const eva: EvaSplitRow[] = [];
  const not_eva: EvaSplitRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const empName = String(row[AR.EMP_NAME - 1] || '').trim();
    const empId = String(row[AR.ID - 1] || '').trim();
    const patient = String(row[AR.PATIENT - 1] || empName).trim();
    const requested = String(row[AR.REQUESTED_MED - 1] || '').trim();
    const newMed = String(row[AR.NEW_MED - 1] || requested).trim();
    if (!empName && !empId) continue;
    if (!requested && !newMed) continue;

    const companyDrug = String(row[AR.COMPANY_DRUG - 1] || '');
    const qty = Number(row[AR.QTY2 - 1] ?? row[AR.QTY - 1]) || 1;
    const isEva = /Available in EVA/i.test(companyDrug);
    const bucket: 'EVA' | 'NOT_EVA' = isEva ? 'EVA' : 'NOT_EVA';

    const item: EvaSplitRow = {
      company: String(row[AR.COMPANY - 1] || ''),
      employee_name: empName || empId,
      employee_id: empId || empName,
      patient_name: patient,
      relation: '',
      program_code: '',
      line_code: '',
      requested_name: requested || newMed,
      matched_name: newMed || requested,
      qty,
      formulary_flag: isEva ? 'EVA_PREFERRED' : 'NOT_IN_EVA',
      company_preferred: isEva,
      bucket,
    };
    if (isEva) eva.push(item);
    else not_eva.push(item);
  }

  return { eva, not_eva, total: eva.length + not_eva.length, source: 'sheet' };
}

export function evaSplitToCsv(rows: EvaSplitRow[]): string {
  const headers = [
    'bucket',
    'company',
    'employee_id',
    'employee_name',
    'patient_name',
    'relation',
    'program_code',
    'line_code',
    'requested_name',
    'matched_name',
    'qty',
    'formulary_flag',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.bucket,
        r.company,
        r.employee_id,
        r.employee_name,
        r.patient_name,
        r.relation,
        r.program_code,
        r.line_code,
        r.requested_name,
        r.matched_name,
        r.qty,
        r.formulary_flag,
      ]
        .map(esc)
        .join(',')
    );
  }
  return lines.join('\n');
}
