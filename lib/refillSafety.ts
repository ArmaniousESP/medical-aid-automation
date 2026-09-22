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
  acknowledge_safety?: boolean
) {
  const report = await getRefillSafetyReport(cycleId);
  if (!report || !report.requires_ack) return report;
  if (acknowledge_safety === true) return report;
  throw new Error(
    `Safety review required before approve/dispense: ${report.summary}. ` +
      `Pass acknowledge_safety: true after pharmacist review. (Ops triage — not clinical CDS.)`
  );
}
