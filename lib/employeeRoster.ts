import { query } from '@/lib/db';
import { expandRosterSeed } from '@/lib/rosterSeed';

export type RosterRow = {
  company: string;
  emp_name: string;
  emp_id?: string | null;
  phone?: string | null;
};

let seedAttempted = false;

export async function ensureEmployeeRosterTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS employee_roster (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company TEXT NOT NULL,
      emp_name TEXT NOT NULL,
      emp_id TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT DEFAULT 'import',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_roster_company_empid
     ON employee_roster (lower(trim(company)), trim(emp_id))
     WHERE emp_id IS NOT NULL AND trim(emp_id) <> ''`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_employee_roster_company ON employee_roster (lower(company))`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_employee_roster_phone ON employee_roster (phone)`
  );
}

function normPhone(p: string): string {
  let d = p.replace(/\D/g, '');
  if (d.startsWith('20') && d.length > 10) d = d.slice(2);
  if (d && !d.startsWith('0') && (d.length === 10 || d.length === 9)) d = '0' + d;
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

export async function upsertEmployeeRoster(
  rows: RosterRow[],
  source = 'import'
): Promise<{ inserted: number; updated: number }> {
  await ensureEmployeeRosterTable();
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const company = (r.company || '').trim();
    const emp_name = (r.emp_name || '').trim();
    if (!company || !emp_name) continue;
    const emp_id = r.emp_id?.trim() || null;
    const phone = r.phone?.trim() || null;

    if (emp_id) {
      const existing = await query<{ id: string }>(
        `SELECT id FROM employee_roster
         WHERE lower(trim(company)) = lower(trim($1))
           AND trim(emp_id) = trim($2)
         LIMIT 1`,
        [company, emp_id]
      );
      if (existing.rows[0]) {
        await query(
          `UPDATE employee_roster SET
             emp_name = $2,
             phone = COALESCE(NULLIF($3, ''), phone),
             status = 'active',
             source = $4,
             updated_at = now()
           WHERE id = $1`,
          [existing.rows[0].id, emp_name, phone, source]
        );
        updated += 1;
        continue;
      }
    }

    await query(
      `INSERT INTO employee_roster (company, emp_name, emp_id, phone, status, source)
       VALUES ($1,$2,$3,$4,'active',$5)`,
      [company, emp_name, emp_id, phone, source]
    );
    inserted += 1;
  }
  return { inserted, updated };
}

/** Load bundled seed once if the table has few rows. */
export async function ensureRosterSeeded(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
  await ensureEmployeeRosterTable();
  const n = await rosterCount();
  // Always ensure seed is applied when under-populated (e.g. partial import)
  if (n >= 200) return;
  try {
    const rows = expandRosterSeed();
    if (rows.length) {
      await upsertEmployeeRoster(rows, 'bundled_seed');
    }
  } catch (e) {
    console.error('roster seed failed', e);
  }
}

export async function findRosterEmployee(input: {
  company: string;
  emp_id: string;
  phone: string;
}): Promise<{
  emp_name: string;
  emp_id: string;
  company: string;
  phone: string | null;
} | null> {
  await ensureEmployeeRosterTable();
  await ensureRosterSeeded();

  const company = input.company.trim();
  const emp_id = input.emp_id.trim();
  const phone = input.phone.trim();
  if (!company || !emp_id || !phone) return null;

  const res = await query<{
    emp_name: string;
    emp_id: string | null;
    company: string;
    phone: string | null;
  }>(
    `SELECT emp_name, emp_id, company, phone FROM employee_roster
     WHERE lower(trim(company)) = lower(trim($1))
       AND trim(coalesce(emp_id,'')) = trim($2)
       AND status = 'active'
     LIMIT 5`,
    [company, emp_id]
  );

  if (!res.rows.length) {
    const byPhone = await query<{
      emp_name: string;
      emp_id: string | null;
      company: string;
      phone: string | null;
    }>(
      `SELECT emp_name, emp_id, company, phone FROM employee_roster
       WHERE lower(trim(company)) = lower(trim($1))
         AND status = 'active'
         AND phone IS NOT NULL
       LIMIT 120`,
      [company]
    );
    const m = byPhone.rows.find(
      (r) => phonesMatch(r.phone, phone) && (r.emp_id || '').trim() === emp_id
    );
    if (!m) return null;
    return {
      emp_name: m.emp_name,
      emp_id: m.emp_id || emp_id,
      company: m.company,
      phone: m.phone,
    };
  }

  const match =
    res.rows.find((r) => phonesMatch(r.phone, phone)) ||
    (res.rows.length === 1 && !res.rows[0].phone ? res.rows[0] : undefined);

  if (!match) return null;
  return {
    emp_name: match.emp_name,
    emp_id: match.emp_id || emp_id,
    company: match.company,
    phone: match.phone,
  };
}

export async function listRosterCompanies(): Promise<string[]> {
  await ensureEmployeeRosterTable();
  await ensureRosterSeeded();
  const res = await query<{ company: string }>(
    `SELECT DISTINCT company FROM employee_roster
     WHERE status = 'active' ORDER BY company`
  );
  return res.rows.map((r) => r.company);
}

export async function rosterCount(): Promise<number> {
  await ensureEmployeeRosterTable();
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM employee_roster WHERE status = 'active'`
  );
  return Number(res.rows[0]?.n || 0);
}
