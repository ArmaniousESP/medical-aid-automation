/**
 * Safety triage before refill approve/dispense.
 * Soft gate: high alerts require acknowledge_safety=true (not a hard clinical lock).
 */

import { query } from '@/lib/db';
import { checkProgramInteractions } from '@/lib/ddinter';
import { checkProgramAllergies } from '@/lib/allergyCrossReact';

export type RefillSafetyReport = {
  program_id: string;
  cycle_id: string;
  requires_ack: boolean;
  ddi_major: number;
  ddi_other: number;
  allergy_high: number;
  allergy_other: number;
  ddi_hits: Array<{ level: string; drug_a: string; drug_b: string; matched_via: string }>;
  allergy_hits: Array<{
    risk: string;
    allergy_label: string;
    med_name: string;
    message: string;
  }>;
  summary: string;
};

export async function getRefillSafetyReport(
  cycleId: string
): Promise<RefillSafetyReport | null> {
  const c = await query<{ id: string; program_id: string }>(
    `SELECT id, program_id FROM refill_cycles WHERE id = $1`,
    [cycleId]
  );
  if (!c.rows[0]) return null;

  const programId = c.rows[0].program_id;

  let ddi_hits: RefillSafetyReport['ddi_hits'] = [];
  try {
    const ddi = await checkProgramInteractions(programId);
    ddi_hits = ddi.hits.map((h) => ({
      level: h.level,
      drug_a: h.drug_a,
      drug_b: h.drug_b,
      matched_via: h.matched_via,
    }));
  } catch {
    ddi_hits = [];
  }

  let allergy_hits: RefillSafetyReport['allergy_hits'] = [];
  try {
    const all = await checkProgramAllergies(programId);
    allergy_hits = all.hits.map((h) => ({
      risk: h.risk,
      allergy_label: h.allergy_label,
      med_name: h.med_name,
      message: h.message,
    }));
  } catch {
    allergy_hits = [];
  }

  const ddi_major = ddi_hits.filter((h) => /major/i.test(h.level)).length;
  const ddi_other = ddi_hits.length - ddi_major;
  const allergy_high = allergy_hits.filter((h) => h.risk === 'high').length;
  const allergy_other = allergy_hits.length - allergy_high;
  const requires_ack = ddi_major > 0 || allergy_high > 0;

  const parts: string[] = [];
  if (ddi_major) parts.push(`${ddi_major} DDInter Major`);
  if (ddi_other) parts.push(`${ddi_other} other DDI`);
  if (allergy_high) parts.push(`${allergy_high} allergy High`);
  if (allergy_other) parts.push(`${allergy_other} other allergy`);

  return {
    program_id: programId,
    cycle_id: cycleId,
    requires_ack,
    ddi_major,
    ddi_other,
    allergy_high,
    allergy_other,
    ddi_hits,
    allergy_hits,
    summary: parts.length ? parts.join(' · ') : 'No high safety flags',
  };
}

/** Throws if high flags present and not acknowledged */
export async function assertRefillSafetyAck(
  cycleId: string,
  acknowledge_safety?: boolean,
  actor?: string
) {
  const report = await getRefillSafetyReport(cycleId);
  if (!report || !report.requires_ack) return report;
  if (acknowledge_safety === true) {
    try {
      await query(
        `INSERT INTO audit_log (entity_type, entity_id, action, actor, to_value)
         VALUES ('refill_cycle', $1, 'safety_acknowledged', $2, $3::jsonb)`,
        [
          cycleId,
          actor || 'api',
          JSON.stringify({
            summary: report.summary,
            ddi_major: report.ddi_major,
            allergy_high: report.allergy_high,
          }),
        ]
      );
    } catch {
      /* audit optional */
    }
    return report;
  }
  throw new Error(
    `Safety review required before approve/dispense: ${report.summary}. ` +
      `Pass acknowledge_safety: true after pharmacist review. (Ops triage — not clinical CDS.)`
  );
}

export type SafetyQueueRow = {
  cycle_id: string;
  period: string;
  status: string;
  program_code: string;
  patient_name: string;
  employee_name: string;
  requires_ack: boolean;
  summary: string;
  ddi_major: number;
  allergy_high: number;
};

/** Scan recent in-review / approved cycles for high safety flags (capped). */
export async function scanRefillSafetyQueue(opts?: {
  limit?: number;
  statuses?: string[];
}): Promise<{ scanned: number; flagged: number; rows: SafetyQueueRow[] }> {
  const limit = Math.min(opts?.limit ?? 40, 80);
  const statuses = opts?.statuses ?? ['in_review', 'approved', 'partially_approved'];

  const cycles = await query<{
    id: string;
    period: string;
    status: string;
    program_code: string;
    patient_name: string;
    employee_name: string;
  }>(
    `SELECT rc.id, rc.period, rc.status, cp.program_code,
            d.full_name AS patient_name, e.full_name AS employee_name
     FROM refill_cycles rc
     JOIN chronic_programs cp ON cp.id = rc.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE rc.status = ANY($1::text[])
     ORDER BY rc.period DESC, rc.requested_at DESC NULLS LAST
     LIMIT $2`,
    [statuses, limit]
  );

  const rows: SafetyQueueRow[] = [];
  for (const c of cycles.rows) {
    const report = await getRefillSafetyReport(c.id);
    if (!report || !report.requires_ack) continue;
    rows.push({
      cycle_id: c.id,
      period: c.period,
      status: c.status,
      program_code: c.program_code,
      patient_name: c.patient_name,
      employee_name: c.employee_name,
      requires_ack: report.requires_ack,
      summary: report.summary,
      ddi_major: report.ddi_major,
      allergy_high: report.allergy_high,
    });
  }

  rows.sort(
    (a, b) =>
      b.ddi_major + b.allergy_high - (a.ddi_major + a.allergy_high)
  );

  return {
    scanned: cycles.rows.length,
    flagged: rows.length,
    rows,
  };
}
