/**
 * Platform-native aid intake — system of record is Neon, not Google Sheets.
 * Optional MSH (Medicine Support Hub) for catalog search & cost estimates.
 */

import { query } from '@/lib/db';

export type IntakeStatus =
  | 'submitted'
  | 'triage'
  | 'approved'
  | 'rejected'
  | 'enrolled'
  | 'dispensed'
  | 'cancelled';

export type IntakeMedLine = {
  name: string;
  qty?: number;
  canonical_id?: string | number;
  matched_name?: string;
  unit_price_egp?: number | null;
};

export type IntakePayload = {
  emp_name: string;
  emp_id?: string;
  company?: string;
  phone?: string;
  patient_name?: string;
  city?: string;
  meds: IntakeMedLine[];
  comments?: string;
  roshetta_urls?: string[];
  invoice_urls?: string[];
  lab_urls?: string[];
  card_urls?: string[];
  source?: string;
  msh_request_id?: string;
  estimated_monthly_cost?: number | null;
};

export async function ensureIntakeTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS aid_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_code TEXT DEFAULT 'DEFAULT',
      status TEXT NOT NULL DEFAULT 'submitted',
      emp_name TEXT NOT NULL,
      emp_id TEXT,
      company TEXT,
      phone TEXT,
      patient_name TEXT,
      city TEXT,
      meds JSONB NOT NULL DEFAULT '[]'::jsonb,
      comments TEXT,
      roshetta_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      invoice_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      lab_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      card_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT DEFAULT 'platform',
      msh_request_id TEXT,
      estimated_monthly_cost NUMERIC,
      match_notes TEXT,
      program_id UUID,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_aid_requests_status ON aid_requests(status)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_aid_requests_created ON aid_requests(created_at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_aid_requests_emp ON aid_requests(emp_id, emp_name)`
  );
}

export async function createAidRequest(input: IntakePayload) {
  await ensureIntakeTables();
  const meds = (input.meds || []).filter((m) => m.name?.trim());
  if (!meds.length) {
    throw new Error('At least one medicine is required');
  }
  if (!input.emp_name?.trim()) {
    throw new Error('emp_name is required');
  }

  const ins = await query<{ id: string; status: string; created_at: string }>(
    `INSERT INTO aid_requests (
       emp_name, emp_id, company, phone, patient_name, city,
       meds, comments, roshetta_urls, invoice_urls, lab_urls, card_urls,
       source, msh_request_id, estimated_monthly_cost, status
     ) VALUES (
       $1,$2,$3,$4,$5,$6,
       $7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
       $13,$14,$15,'submitted'
     )
     RETURNING id, status, created_at`,
    [
      input.emp_name.trim(),
      input.emp_id?.trim() || null,
      input.company?.trim() || null,
      input.phone?.trim() || null,
      input.patient_name?.trim() || null,
      input.city?.trim() || null,
      JSON.stringify(meds),
      input.comments || null,
      JSON.stringify(input.roshetta_urls || []),
      JSON.stringify(input.invoice_urls || []),
      JSON.stringify(input.lab_urls || []),
      JSON.stringify(input.card_urls || []),
      input.source || 'platform',
      input.msh_request_id || null,
      input.estimated_monthly_cost ?? null,
    ]
  );
  return ins.rows[0];
}

export async function listAidRequests(opts?: {
  status?: string;
  limit?: number;
  q?: string;
}) {
  await ensureIntakeTables();
  const params: unknown[] = [];
  const where = ['1=1'];
  if (opts?.status && opts.status !== 'all') {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts?.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(
      `(emp_name ILIKE $${params.length} OR emp_id ILIKE $${params.length} OR patient_name ILIKE $${params.length} OR company ILIKE $${params.length})`
    );
  }
  params.push(Math.min(opts?.limit ?? 50, 200));
  const res = await query(
    `SELECT * FROM aid_requests
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return res.rows;
}

export async function updateAidRequestStatus(
  id: string,
  status: IntakeStatus,
  extra?: { match_notes?: string; program_id?: string }
) {
  await ensureIntakeTables();
  await query(
    `UPDATE aid_requests SET
       status = $2,
       match_notes = COALESCE($3, match_notes),
       program_id = COALESCE($4::uuid, program_id),
       processed_at = CASE WHEN $2 IN ('approved','enrolled','dispensed','rejected') THEN now() ELSE processed_at END,
       updated_at = now()
     WHERE id = $1`,
    [id, status, extra?.match_notes || null, extra?.program_id || null]
  );
}

/** Pending submitted/triage requests for the platform processor */
export async function listPendingIntake(limit = 100) {
  await ensureIntakeTables();
  const res = await query(
    `SELECT * FROM aid_requests
     WHERE status IN ('submitted','triage')
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}
