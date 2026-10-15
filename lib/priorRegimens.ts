import { query } from '@/lib/db';

export type PriorMed = {
  name: string;
  requested_name?: string;
  qty: number;
  eva?: string;
  price?: string;
};

export type PriorRegimen = {
  id: string;
  company: string;
  emp_name: string;
  emp_id: string | null;
  phone: string | null;
  patient_name: string;
  support_year: number;
  meds: PriorMed[];
  last_update: string | null;
  notes: string | null;
  status: string;
  renewal_status: string;
  renewed_request_id: string | null;
};

/** Official target for employees to confirm/update regimen for next-year support */
export const RENEWAL_DEADLINE = '2026-12-10';
export const RENEWAL_YEAR = 2027;

export function renewalDeadlinePassed(now = new Date()): boolean {
  return now > new Date(RENEWAL_DEADLINE + 'T23:59:59');
}

export async function ensurePriorRegimenTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS prior_regimens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company TEXT NOT NULL,
      emp_name TEXT NOT NULL,
      emp_id TEXT,
      phone TEXT,
      patient_name TEXT NOT NULL,
      support_year INT NOT NULL DEFAULT 2026,
      meds JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_update TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'fulfilled',
      renewal_status TEXT NOT NULL DEFAULT 'pending_2027',
      renewed_request_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_prior_regimens_emp ON prior_regimens (company, emp_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_prior_regimens_phone ON prior_regimens (phone)`
  );
}

function normPhone(p: string): string {
  let d = p.replace(/\D/g, '');
  if (d.startsWith('20') && d.length > 10) d = d.slice(2);
  if (d && !d.startsWith('0') && (d.length === 9 || d.length === 10)) d = '0' + d;
  return d;
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const x = normPhone(a);
  const y = normPhone(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 8 && y.length >= 8) return x.slice(-8) === y.slice(-8);
  return false;
}

export async function listPriorRegimensForEmployee(input: {
  company: string;
  emp_id: string;
  phone: string;
}): Promise<PriorRegimen[]> {
  await ensurePriorRegimenTables();
  const company = input.company.trim();
  const emp_id = input.emp_id.trim();
  if (!company || !emp_id) return [];

  const res = await query<{
    id: string;
    company: string;
    emp_name: string;
    emp_id: string | null;
    phone: string | null;
    patient_name: string;
    support_year: number;
    meds: PriorMed[];
    last_update: string | null;
    notes: string | null;
    status: string;
    renewal_status: string;
    renewed_request_id: string | null;
  }>(
    `SELECT id, company, emp_name, emp_id, phone, patient_name, support_year,
            meds, last_update, notes, status, renewal_status, renewed_request_id
     FROM prior_regimens
     WHERE lower(trim(company)) = lower(trim($1))
       AND trim(coalesce(emp_id,'')) = trim($2)
     ORDER BY patient_name`,
    [company, emp_id]
  );

  const matched = res.rows.filter(
    (r) => !r.phone || phonesMatch(r.phone, input.phone)
  );
  if (!matched.length) {
    if (res.rows.length && res.rows.every((r) => !r.phone)) return res.rows as PriorRegimen[];
    return [];
  }
  return matched as PriorRegimen[];
}

export async function getPriorRegimenById(id: string): Promise<PriorRegimen | null> {
  await ensurePriorRegimenTables();
  const rid = String(id || '').trim();
  if (!rid) return null;
  const res = await query<{
    id: string;
    company: string;
    emp_name: string;
    emp_id: string | null;
    phone: string | null;
    patient_name: string;
    support_year: number;
    meds: PriorMed[];
    last_update: string | null;
    notes: string | null;
    status: string;
    renewal_status: string;
    renewed_request_id: string | null;
  }>(
    `SELECT id, company, emp_name, emp_id, phone, patient_name, support_year,
            meds, last_update, notes, status, renewal_status, renewed_request_id
     FROM prior_regimens WHERE id = $1::uuid LIMIT 1`,
    [rid]
  );
  return (res.rows[0] as PriorRegimen) || null;
}

export async function upsertPriorRegimens(
  rows: {
    company: string;
    emp_name: string;
    emp_id?: string | null;
    phone?: string | null;
    patient_name: string;
    support_year?: number;
    meds: PriorMed[];
    last_update?: string | null;
    notes?: string | null;
    status?: string;
  }[]
): Promise<number> {
  await ensurePriorRegimenTables();
  let n = 0;
  for (const r of rows) {
    await query(
      `INSERT INTO prior_regimens (
         company, emp_name, emp_id, phone, patient_name, support_year, meds,
         last_update, notes, status, renewal_status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,'pending_2027')`,
      [
        r.company,
        r.emp_name,
        r.emp_id || null,
        r.phone || null,
        r.patient_name,
        r.support_year ?? 2026,
        JSON.stringify(r.meds || []),
        r.last_update || null,
        r.notes || null,
        r.status || 'fulfilled',
      ]
    );
    n += 1;
  }
  return n;
}

export async function markRegimenRenewed(
  regimenId: string,
  requestId: string
): Promise<void> {
  await query(
    `UPDATE prior_regimens
     SET renewal_status = 'renewed_2027',
         renewed_request_id = $2::uuid,
         updated_at = now()
     WHERE id = $1::uuid`,
    [regimenId, requestId]
  );
}

export async function priorRegimenCount(): Promise<number> {
  await ensurePriorRegimenTables();
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM prior_regimens`
  );
  return Number(res.rows[0]?.n || 0);
}
