import { query } from '@/lib/db';
import { checkInteractions, ddinterStats, type DdiHit } from '@/lib/ddinter';

export type ProgramDdiResult = {
  program_id: string;
  program_code: string;
  patient_name: string;
  meds: string[];
  hits: DdiHit[];
  major_count: number;
};

/** Scan active multi-drug programs for DDInter hits (capped for performance). */
export async function scanProgramsForDdi(opts?: {
  limit?: number;
  minMeds?: number;
}): Promise<{
  pair_db_count: number;
  scanned: number;
  with_hits: number;
  results: ProgramDdiResult[];
}> {
  const limit = Math.min(opts?.limit ?? 30, 80);
  const minMeds = opts?.minMeds ?? 2;
  const stats = await ddinterStats();

  if (stats.pairs === 0) {
    return { pair_db_count: 0, scanned: 0, with_hits: 0, results: [] };
  }

  const programs = await query<{
    program_id: string;
    program_code: string;
    patient_name: string;
    meds: string;
  }>(
    `SELECT
       cp.id AS program_id,
       cp.program_code,
       d.full_name AS patient_name,
       string_agg(
         coalesce(nullif(trim(ml.matched_name), ''), ml.requested_name),
         ' || ' ORDER BY ml.line_code
       ) AS meds
     FROM chronic_programs cp
     JOIN dependents d ON d.id = cp.dependent_id
     JOIN chronic_med_lines ml ON ml.program_id = cp.id AND ml.is_active
     WHERE cp.status = 'active'
     GROUP BY cp.id, cp.program_code, d.full_name
     HAVING count(ml.id) >= $1
     ORDER BY count(ml.id) DESC
     LIMIT $2`,
    [minMeds, limit]
  );

  const results: ProgramDdiResult[] = [];
  let with_hits = 0;

  for (const p of programs.rows) {
    const meds = String(p.meds || '')
      .split('||')
      .map((s) => s.trim())
      .filter(Boolean);
    const { hits } = await checkInteractions(meds);
    if (hits.length > 0) with_hits += 1;
    results.push({
      program_id: p.program_id,
      program_code: p.program_code,
      patient_name: p.patient_name,
      meds,
      hits,
      major_count: hits.filter((h) => /major/i.test(h.level)).length,
    });
  }

  results.sort((a, b) => b.major_count - a.major_count || b.hits.length - a.hits.length);

  return {
    pair_db_count: stats.pairs,
    scanned: programs.rows.length,
    with_hits,
    results: results.filter((r) => r.hits.length > 0),
  };
}

/** Annotate co-prescription pairs with DDInter level when names match. */
export async function annotatePairsWithDdinter(
  pairs: Array<{ drug_a: string; drug_b: string; program_count: number; pct_of_programs: number }>
) {
  const stats = await ddinterStats();
  if (stats.pairs === 0) {
    return pairs.map((p) => ({ ...p, ddinter_level: null as string | null }));
  }

  const out: Array<
    (typeof pairs)[0] & { ddinter_level: string | null }
  > = [];

  for (const p of pairs) {
    const { hits } = await checkInteractions([p.drug_a, p.drug_b]);
    const major = hits.find((h) => /major/i.test(h.level));
    const any = hits[0];
    out.push({
      ...p,
      ddinter_level: major?.level || any?.level || null,
    });
  }
  return out;
}
