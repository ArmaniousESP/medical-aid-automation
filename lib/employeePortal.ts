import { query } from '@/lib/db';
import { ensureIntakeTables } from '@/lib/intake';
import { findRosterEmployee } from '@/lib/employeeRoster';

export type EmployeeRequestSummary = {
  id: string;
  status: string;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
  med_count: number;
  has_staff_note: boolean;
  open_inquiry: boolean;
};

export type EmployeeProfile = {
  emp_name: string;
  emp_id: string;
  company: string;
  phone_masked: string;
  city: string | null;
  request_count: number;
  requests: EmployeeRequestSummary[];
};

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '');
}

function maskPhone(p: string | null | undefined): string {
  if (!p) return '—';
  const d = normalizePhone(p);
  if (d.length < 6) return '••••';
  return `${d.slice(0, 3)}••••${d.slice(-3)}`;
}

function phonesMatch(stored: string | null | undefined, given: string): boolean {
  if (!stored || !given) return false;
  const a = normalizePhone(stored);
  const b = normalizePhone(given);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.length >= 8) {
    return a.slice(-8) === b.slice(-8);
  }
  return false;
}

export async function ensureEmployeePortalTables() {
  await ensureIntakeTables();
  await query(`
    CREATE TABLE IF NOT EXISTS request_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID NOT NULL REFERENCES aid_requests(id) ON DELETE CASCADE,
      author_role TEXT NOT NULL CHECK (author_role IN ('staff', 'employee')),
      author_label TEXT,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_request_messages_req ON request_messages(request_id, created_at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_aid_requests_company_emp ON aid_requests(company, emp_id)`
  );
}

/**
 * Public lookup: company + emp_id + phone.
 * Prefer prior aid_requests; otherwise HR employee_roster for first-time profile.
 */
export async function lookupEmployeeProfile(input: {
  company: string;
  emp_id: string;
  phone: string;
}): Promise<EmployeeProfile | null> {
  await ensureEmployeePortalTables();
  const company = input.company.trim();
  const empId = input.emp_id.trim();
  const phone = input.phone.trim();
  if (!company || !empId || !phone) return null;

  const rows = await query<{
    id: string;
    status: string;
    emp_name: string;
    emp_id: string | null;
    company: string | null;
    phone: string | null;
    patient_name: string | null;
    city: string | null;
    meds: unknown;
    match_notes: string | null;
    comments: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, status, emp_name, emp_id, company, phone, patient_name, city,
            meds, match_notes, comments, created_at, updated_at
     FROM aid_requests
     WHERE lower(trim(coalesce(company,''))) = lower(trim($1))
       AND trim(coalesce(emp_id,'')) = trim($2)
     ORDER BY created_at DESC
     LIMIT 40`,
    [company, empId]
  );

  if (!rows.rows.length) {
    const roster = await findRosterEmployee({ company, emp_id: empId, phone });
    if (!roster) return null;
    return {
      emp_name: roster.emp_name,
      emp_id: empId,
      company,
      phone_masked: maskPhone(roster.phone),
      city: null,
      request_count: 0,
      requests: [],
    };
  }

  const verified = rows.rows.some((r) => phonesMatch(r.phone, phone));
  if (!verified) return null;

  const ids = rows.rows.map((r) => r.id);
  const msgCounts = await query<{
    request_id: string;
    staff_n: string;
    emp_n: string;
    last_role: string | null;
  }>(
    `SELECT request_id::text,
            count(*) FILTER (WHERE author_role = 'staff')::text AS staff_n,
            count(*) FILTER (WHERE author_role = 'employee')::text AS emp_n,
            (ARRAY_AGG(author_role ORDER BY created_at DESC))[1] AS last_role
     FROM request_messages
     WHERE request_id = ANY($1::uuid[])
     GROUP BY request_id`,
    [ids]
  );
  const msgMap = new Map(msgCounts.rows.map((m) => [m.request_id, m]));

  const first = rows.rows[0];
  const requests: EmployeeRequestSummary[] = rows.rows.map((r) => {
    const meds = Array.isArray(r.meds) ? r.meds : [];
    const m = msgMap.get(r.id);
    const openInquiry =
      (m && m.last_role === 'staff') ||
      (!!r.match_notes && (!m || Number(m.emp_n) === 0));
    return {
      id: r.id,
      status: r.status,
      patient_name: r.patient_name,
      created_at: r.created_at,
      updated_at: r.updated_at,
      med_count: meds.length,
      has_staff_note: !!(r.match_notes || (m && Number(m.staff_n) > 0)),
      open_inquiry: !!openInquiry,
    };
  });

  return {
    emp_name: first.emp_name,
    emp_id: empId,
    company,
    phone_masked: maskPhone(first.phone),
    city: first.city,
    request_count: requests.length,
    requests,
  };
}

export async function listRequestMessages(requestId: string) {
  await ensureEmployeePortalTables();
  const r = await query<{
    id: string;
    author_role: string;
    author_label: string | null;
    body: string;
    created_at: string;
  }>(
    `SELECT id, author_role, author_label, body, created_at
     FROM request_messages
     WHERE request_id = $1
     ORDER BY created_at ASC
     LIMIT 100`,
    [requestId]
  );
  return r.rows;
}

export async function postEmployeeReply(input: {
  request_id: string;
  company: string;
  emp_id: string;
  phone: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureEmployeePortalTables();
  const body = input.body.trim();
  if (body.length < 2) return { ok: false, error: 'Message too short' };
  if (body.length > 2000) return { ok: false, error: 'Message too long' };

  const req = await query<{
    id: string;
    company: string | null;
    emp_id: string | null;
    phone: string | null;
    emp_name: string;
  }>(
    `SELECT id, company, emp_id, phone, emp_name FROM aid_requests WHERE id = $1`,
    [input.request_id]
  );
  const row = req.rows[0];
  if (!row) return { ok: false, error: 'Request not found' };

  const companyOk =
    (row.company || '').trim().toLowerCase() === input.company.trim().toLowerCase();
  const empOk = (row.emp_id || '').trim() === input.emp_id.trim();
  const phoneOk = phonesMatch(row.phone, input.phone);
  if (!companyOk || !empOk || !phoneOk) {
    return { ok: false, error: 'Verification failed' };
  }

  await query(
    `INSERT INTO request_messages (request_id, author_role, author_label, body)
     VALUES ($1, 'employee', $2, $3)`,
    [input.request_id, row.emp_name, body]
  );
  await query(`UPDATE aid_requests SET updated_at = now() WHERE id = $1`, [
    input.request_id,
  ]);
  return { ok: true };
}

export async function postStaffInquiry(input: {
  request_id: string;
  body: string;
  author_label?: string;
}): Promise<void> {
  await ensureEmployeePortalTables();
  await query(
    `INSERT INTO request_messages (request_id, author_role, author_label, body)
     VALUES ($1, 'staff', $2, $3)`,
    [input.request_id, input.author_label || 'Reviewer', input.body.trim()]
  );
  await query(`UPDATE aid_requests SET updated_at = now() WHERE id = $1`, [
    input.request_id,
  ]);
}
