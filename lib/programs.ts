import { query, getDefaultOrgId } from '@/lib/db';
import { buildProgramId } from '@/lib/tpa/chronic';

export type EnrollMedInput = {
  lineCode?: string;
  requestedName: string;
  matchedName?: string;
  qtyPerCycle?: number;
  daysSupply?: number;
  formularyFlag?: string;
  companyPreferred?: boolean;
  doseText?: string;
};

export type EnrollProgramInput = {
  externalEmployeeId: string;
  employeeName: string;
  patientName: string;
  relation?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string | null;
  sequence?: number;
  roshettaUrl?: string;
  meds: EnrollMedInput[];
  notes?: string;
};

/**
 * Upsert employee + dependent, create active chronic program + med lines.
 * Idempotent on program_code if sequence is stable.
 */
export async function enrollChronicProgram(input: EnrollProgramInput) {
  if (!input.externalEmployeeId || !input.employeeName || !input.patientName) {
    throw new Error('externalEmployeeId, employeeName, patientName required');
  }
  if (!input.meds?.length) {
    throw new Error('At least one medication required');
  }

  const orgId = await getDefaultOrgId();
  const relation = input.relation || 'self';
  const year = new Date().getFullYear();
  const sequence = input.sequence ?? 1;
  const programCode = buildProgramId(input.externalEmployeeId, sequence, year);
  const startDate = input.startDate || `${year}-01-01`;

  // Employee
  let emp = await query<{ id: string }>(
    `SELECT id FROM employees WHERE org_id = $1 AND external_employee_id = $2`,
    [orgId, input.externalEmployeeId]
  );
  let employeeId: string;
  if (emp.rows[0]) {
    employeeId = emp.rows[0].id;
    await query(
      `UPDATE employees SET full_name = $1, updated_at = now() WHERE id = $2`,
      [input.employeeName, employeeId]
    );
  } else {
    const ins = await query<{ id: string }>(
      `INSERT INTO employees (org_id, external_employee_id, full_name, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [orgId, input.externalEmployeeId, input.employeeName]
    );
    employeeId = ins.rows[0].id;
  }

  // Dependent
  let dep = await query<{ id: string }>(
    `SELECT id FROM dependents
     WHERE employee_id = $1 AND full_name = $2 AND relation = $3`,
    [employeeId, input.patientName, relation]
  );
  let dependentId: string;
  if (dep.rows[0]) {
    dependentId = dep.rows[0].id;
  } else {
    const dins = await query<{ id: string }>(
      `INSERT INTO dependents (employee_id, full_name, relation, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [employeeId, input.patientName, relation]
    );
    dependentId = dins.rows[0].id;
  }

  // Program (skip if exists)
  const existing = await query<{ id: string }>(
    `SELECT id FROM chronic_programs WHERE program_code = $1`,
    [programCode]
  );
  if (existing.rows[0]) {
    return {
      created: false,
      program_code: programCode,
      program_id: existing.rows[0].id,
      message: 'Program already exists',
    };
  }

  const progIns = await query<{ id: string }>(
    `INSERT INTO chronic_programs (
       program_code, org_id, employee_id, dependent_id, status,
       start_date, end_date, renewal_mode, notes, created_by
     ) VALUES ($1, $2, $3, $4, 'active', $5, $6, 'monthly_refill', $7, 'enroll-api')
     RETURNING id`,
    [
      programCode,
      orgId,
      employeeId,
      dependentId,
      startDate,
      input.endDate ?? null,
      input.notes ?? null,
    ]
  );
  const programId = progIns.rows[0].id;

  if (input.roshettaUrl) {
    await query(
      `INSERT INTO attachments (entity_type, entity_id, doc_type, url)
       VALUES ('program', $1, 'prescription', $2)`,
      [programId, input.roshettaUrl]
    );
  }

  let lineNo = 0;
  for (const m of input.meds) {
    lineNo += 1;
    const lineCode = m.lineCode || `L${lineNo}`;
    await query(
      `INSERT INTO chronic_med_lines (
         program_id, line_code, requested_name, matched_name,
         qty_per_cycle, days_supply, formulary_flag, company_preferred, dose_text
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (program_id, line_code) DO NOTHING`,
      [
        programId,
        lineCode,
        m.requestedName,
        m.matchedName || m.requestedName,
        m.qtyPerCycle ?? 1,
        m.daysSupply ?? 30,
        m.formularyFlag ?? null,
        !!m.companyPreferred,
        m.doseText ?? null,
      ]
    );
  }

  return {
    created: true,
    program_code: programCode,
    program_id: programId,
    med_count: input.meds.length,
  };
}
