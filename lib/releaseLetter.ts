/**
 * Pharmacy release letter — Axios PMS publicly lists auto-generated release letters.
 * Simple document record for monthly dispense authorization.
 */

import { query } from '@/lib/db';

export async function ensureReleaseLettersTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS release_letters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        cycle_id UUID,
        letter_code TEXT NOT NULL,
        period TEXT,
        status TEXT DEFAULT 'issued',
        issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        pharmacy_note TEXT,
        body TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  } catch {
    /* ignore */
  }
}

function letterCode(programCode: string, period: string) {
  const p = period.replace('-', '');
  const short = programCode.replace(/[^A-Za-z0-9]/g, '').slice(-8) || 'PROG';
  return `RL-${p}-${short}`;
}

export async function issueReleaseLetter(input: {
  program_id: string;
  cycle_id?: string;
  period?: string;
  pharmacy_note?: string;
}) {
  await ensureReleaseLettersTable();

  const d = new Date();
  const period =
    input.period ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const info = await query<{
    program_code: string;
    employee_name: string;
    patient_name: string;
    employee_id: string;
  }>(
    `SELECT cp.program_code, e.full_name AS employee_name,
            e.external_employee_id AS employee_id,
            d.full_name AS patient_name
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE cp.id = $1`,
    [input.program_id]
  );
  const row = info.rows[0];
  if (!row) throw new Error('program not found');

  const meds = await query<{ matched_name: string; qty_per_cycle: number }>(
    `SELECT coalesce(matched_name, requested_name) AS matched_name, qty_per_cycle
     FROM chronic_med_lines WHERE program_id = $1 AND is_active`,
    [input.program_id]
  );

  const medList = meds.rows
    .map((m) => `• ${m.matched_name} × ${m.qty_per_cycle}`)
    .join('\n');

  const code = letterCode(row.program_code, period);
  const body = [
    `Release Letter ${code}`,
    `Period: ${period}`,
    `Program: ${row.program_code}`,
    `Employee: ${row.employee_name} (${row.employee_id})`,
    `Patient: ${row.patient_name}`,
    ``,
    `Authorized medications:`,
    medList || '• (no active lines)',
    ``,
    input.pharmacy_note ? `Note: ${input.pharmacy_note}` : '',
    `Issued: ${d.toISOString().slice(0, 10)}`,
    `— Medical Aid Program`,
  ]
    .filter(Boolean)
    .join('\n');

  const ins = await query<{ id: string }>(
    `INSERT INTO release_letters (
       program_id, cycle_id, letter_code, period, status, pharmacy_note, body
     ) VALUES ($1, $2, $3, $4, 'issued', $5, $6)
     RETURNING id`,
    [
      input.program_id,
      input.cycle_id || null,
      code,
      period,
      input.pharmacy_note || null,
      body,
    ]
  );

  return { id: ins.rows[0].id, letter_code: code, body, period };
}

export async function listReleaseLetters(programId: string) {
  await ensureReleaseLettersTable();
  const res = await query(
    `SELECT * FROM release_letters WHERE program_id = $1 ORDER BY issued_at DESC LIMIT 20`,
    [programId]
  );
  return res.rows;
}
