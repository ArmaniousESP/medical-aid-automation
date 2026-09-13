import { CONFIG, AR } from '@/lib/config';
import { normalize, cleanDriveLinks } from '@/lib/matching';
import { getSheetValues, getSpreadsheetIdFromEnv } from '@/lib/google';
import { query, getDefaultOrgId } from '@/lib/db';
import { enrollChronicProgram } from '@/lib/programs';

export type SyncResult = {
  groups: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: Array<{
    employeeId: string;
    patient: string;
    action: 'created' | 'updated' | 'skipped' | 'error';
    program_code?: string;
    meds?: number;
    message?: string;
  }>;
};

function extractRoshetta(notes: string): string | undefined {
  if (!notes) return undefined;
  const m = notes.match(/روشتة:\s*(https?:\/\/\S+)/);
  if (m) return cleanDriveLinks(m[1]).split(',')[0]?.trim();
  const urls = notes.match(/https?:\/\/drive\.google\.com\/\S+/g);
  return urls?.[0];
}

function groupKey(empId: string, empName: string, patient: string) {
  const id = String(empId || '').trim() || normalize(empName);
  return `${id}||${normalize(patient || empName)}`;
}

/**
 * Read Approved-Requests, group by employee+patient,
 * create or extend active chronic programs in Neon.
 */
export async function syncApprovedToPrograms(): Promise<SyncResult> {
  const spreadsheetId = await getSpreadsheetIdFromEnv();
  const raw = await getSheetValues(spreadsheetId, `${CONFIG.APPROVED_SHEET}!A:U`);

  const groups = new Map<
    string,
    {
      empId: string;
      empName: string;
      patient: string;
      meds: Map<
        string,
        {
          requestedName: string;
          matchedName: string;
          qty: number;
          formularyFlag: string;
          companyPreferred: boolean;
        }
      >;
      roshetta?: string;
    }
  >();

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const empName = String(row[AR.EMP_NAME - 1] || '').trim();
    const empId = String(row[AR.ID - 1] || '').trim();
    const patient = String(row[AR.PATIENT - 1] || empName).trim();
    const requestedMed = String(row[AR.REQUESTED_MED - 1] || '').trim();
    const newMed = String(row[AR.NEW_MED - 1] || requestedMed).trim();
    if (!empName && !empId) continue;
    if (!requestedMed && !newMed) continue;

    const qtyRaw = row[AR.QTY2 - 1] ?? row[AR.QTY - 1];
    const qty = Number(qtyRaw) || 1;
    const companyDrug = String(row[AR.COMPANY_DRUG - 1] || '');
    const notes = String(row[AR.NOTES - 1] || '');
    const isEva = /Available in EVA/i.test(companyDrug);

    const key = groupKey(empId, empName, patient);
    if (!groups.has(key)) {
      groups.set(key, {
        empId: empId || normalize(empName),
        empName: empName || empId,
        patient,
        meds: new Map(),
        roshetta: extractRoshetta(notes),
      });
    }
    const g = groups.get(key)!;
    if (!g.roshetta) {
      const r = extractRoshetta(notes);
      if (r) g.roshetta = r;
    }

    const medKey = normalize(newMed || requestedMed);
    if (!medKey) continue;
    if (!g.meds.has(medKey)) {
      g.meds.set(medKey, {
        requestedName: requestedMed || newMed,
        matchedName: newMed || requestedMed,
        qty,
        formularyFlag: isEva ? 'EVA_PREFERRED' : 'NOT_IN_EVA',
        companyPreferred: isEva,
      });
    }
  }

  const result: SyncResult = {
    groups: groups.size,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  const groupList = Array.from(groups.values());
  for (let i = 0; i < groupList.length; i++) {
    const g = groupList[i];
    try {
      const action = await upsertGroup(g);
      result.details.push(action);
      if (action.action === 'created') result.created += 1;
      else if (action.action === 'updated') result.updated += 1;
      else if (action.action === 'skipped') result.skipped += 1;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'unknown error';
      result.errors.push(`${g.empId}/${g.patient}: ${message}`);
      result.details.push({
        employeeId: g.empId,
        patient: g.patient,
        action: 'error',
        message,
      });
    }
  }

  return result;
}

async function upsertGroup(g: {
  empId: string;
  empName: string;
  patient: string;
  meds: Map<
    string,
    {
      requestedName: string;
      matchedName: string;
      qty: number;
      formularyFlag: string;
      companyPreferred: boolean;
    }
  >;
  roshetta?: string;
}) {
  const orgId = await getDefaultOrgId();
  const relation =
    normalize(g.patient) === normalize(g.empName) ? 'self' : 'other';

  const existing = await query<{ id: string; program_code: string }>(
    `SELECT cp.id, cp.program_code
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE e.org_id = $1
       AND e.external_employee_id = $2
       AND lower(trim(d.full_name)) = lower(trim($3))
       AND cp.status = 'active'
     ORDER BY cp.created_at DESC
     LIMIT 1`,
    [orgId, g.empId, g.patient]
  );

  const medList = Array.from(g.meds.values());

  if (!existing.rows[0]) {
    const enrolled = await enrollChronicProgram({
      externalEmployeeId: g.empId,
      employeeName: g.empName,
      patientName: g.patient,
      relation,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null,
      sequence: 1,
      roshettaUrl: g.roshetta,
      notes: 'Synced from Approved-Requests',
      meds: medList.map((m) => ({
        requestedName: m.requestedName,
        matchedName: m.matchedName,
        qtyPerCycle: m.qty,
        formularyFlag: m.formularyFlag,
        companyPreferred: m.companyPreferred,
      })),
    });

    return {
      employeeId: g.empId,
      patient: g.patient,
      action: enrolled.created ? ('created' as const) : ('skipped' as const),
      program_code: enrolled.program_code,
      meds: medList.length,
      message: enrolled.message,
    };
  }

  const programId = existing.rows[0].id;
  const programCode = existing.rows[0].program_code;

  const current = await query<{ matched_name: string | null; requested_name: string }>(
    `SELECT matched_name, requested_name FROM chronic_med_lines WHERE program_id = $1`,
    [programId]
  );
  const existingNorms = new Set(
    current.rows.map((r) => normalize(r.matched_name || r.requested_name))
  );

  let added = 0;
  let lineNo = current.rows.length;
  for (let i = 0; i < medList.length; i++) {
    const m = medList[i];
    const n = normalize(m.matchedName || m.requestedName);
    if (existingNorms.has(n)) continue;
    lineNo += 1;
    await query(
      `INSERT INTO chronic_med_lines (
         program_id, line_code, requested_name, matched_name,
         qty_per_cycle, days_supply, formulary_flag, company_preferred, is_active
       ) VALUES ($1, $2, $3, $4, $5, 30, $6, $7, true)`,
      [
        programId,
        `L${lineNo}`,
        m.requestedName,
        m.matchedName,
        m.qty,
        m.formularyFlag,
        m.companyPreferred,
      ]
    );
    added += 1;
  }

  if (g.roshetta) {
    const att = await query(
      `SELECT id FROM attachments
       WHERE entity_type = 'program' AND entity_id = $1 AND doc_type = 'prescription' AND url = $2`,
      [programId, g.roshetta]
    );
    if (!att.rows[0]) {
      await query(
        `INSERT INTO attachments (entity_type, entity_id, doc_type, url)
         VALUES ('program', $1, 'prescription', $2)`,
        [programId, g.roshetta]
      );
    }
  }

  if (added === 0) {
    return {
      employeeId: g.empId,
      patient: g.patient,
      action: 'skipped' as const,
      program_code: programCode,
      meds: medList.length,
      message: 'Program up to date',
    };
  }

  return {
    employeeId: g.empId,
    patient: g.patient,
    action: 'updated' as const,
    program_code: programCode,
    meds: added,
    message: `Added ${added} med line(s)`,
  };
}
