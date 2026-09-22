/**
 * Observe medicine combinations across active chronic programs.
 * Co-prescription pairs, regimen size, simple pattern flags (ops signals — not a full DDI engine).
 */

import { query } from '@/lib/db';

export type MedPair = {
  drug_a: string;
  drug_b: string;
  program_count: number;
  pct_of_programs: number;
};

export type RegimenSize = {
  med_count: number;
  program_count: number;
};

export type ProgramCombo = {
  program_id: string;
  program_code: string;
  employee_name: string;
  patient_name: string;
  med_count: number;
  meds: string[];
  flags: string[];
};

export type CombinationReport = {
  active_programs: number;
  programs_with_2plus: number;
  pairs: MedPair[];
  regimen_sizes: RegimenSize[];
  multi_drug_programs: ProgramCombo[];
  pattern_flags: Array<{ flag: string; label: string; count: number }>;
};

/** Lightweight name-based pattern flags for ops review (not clinical decision support) */
const PATTERN_RULES: Array<{
  flag: string;
  label: string;
  test: (names: string[]) => boolean;
}> = [
  {
    flag: 'dual_metformin_gliptin',
    label: 'Metformin + DPP-4 (gliptin) in same regimen',
    test: (n) =>
      n.some((x) => /metformin|glucophage|cidophage|diabetron/i.test(x)) &&
      n.some((x) => /gliptin|januvia|galvus|onglyza|gliptus|trajenta/i.test(x)),
  },
  {
    flag: 'sglt2_metformin',
    label: 'SGLT2 + metformin',
    test: (n) =>
      n.some((x) => /metformin|glucophage|cidophage/i.test(x)) &&
      n.some((x) => /flozin|jardiance|forxiga|invokana|empixera|empagliflozin|dapagliflozin/i.test(x)),
  },
  {
    flag: 'insulin_oral',
    label: 'Insulin + oral antidiabetic',
    test: (n) =>
      n.some((x) => /insulin|lantus|tresiba|novorapid|humalog|levemir|toujeo|insulatard/i.test(x)) &&
      n.some((x) => /metformin|gliptin|flozin|gliclazide|glimepiride|amaryl|diamicron/i.test(x)),
  },
  {
    flag: 'dual_antiplatelet',
    label: 'Possible dual antiplatelet (ASA + other)',
    test: (n) =>
      n.some((x) => /aspirin|asa\b|cartia|jusal/i.test(x)) &&
      n.some((x) => /clopidogrel|plavix|ticagrelor|brilinta|prasugrel|effient/i.test(x)),
  },
  {
    flag: 'ace_arb',
    label: 'ACE inhibitor + ARB both present',
    test: (n) =>
      n.some((x) => /pril\b|captopril|enalapril|ramipril|perindopril|lisinopril|tritace|coversyl/i.test(x)) &&
      n.some((x) => /sartan|losartan|valsartan|telmisartan|candesartan|olmesartan|cozaar|diovan/i.test(x)),
  },
  {
    flag: 'statin_fibrate',
    label: 'Statin + fibrate',
    test: (n) =>
      n.some((x) => /statin|atorvastatin|rosuvastatin|simvastatin|lipitor|crestor|zocor/i.test(x)) &&
      n.some((x) => /fibrate|fenofibrate|gemfibrozil|lipanthyl|lopid/i.test(x)),
  },
  {
    flag: 'polypharmacy_5',
    label: '5+ active meds on one program',
    test: (n) => n.length >= 5,
  },
];

function normalizeDrugLabel(s: string) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getCombinationReport(opts?: {
  pairLimit?: number;
  multiLimit?: number;
}): Promise<CombinationReport> {
  const pairLimit = Math.min(opts?.pairLimit ?? 40, 100);
  const multiLimit = Math.min(opts?.multiLimit ?? 50, 150);

  const countRes = await query<{ n: string; multi: string }>(
    `SELECT
       count(*)::text AS n,
       count(*) FILTER (
         WHERE (SELECT count(*) FROM chronic_med_lines ml
                WHERE ml.program_id = cp.id AND ml.is_active) >= 2
       )::text AS multi
     FROM chronic_programs cp
     WHERE cp.status = 'active'`
  );
  const active_programs = Number(countRes.rows[0]?.n || 0);
  const programs_with_2plus = Number(countRes.rows[0]?.multi || 0);

  // Pairwise co-occurrence within the same program (ordered a < b to avoid duplicates)
  const pairsRes = await query<{ drug_a: string; drug_b: string; program_count: string }>(
    `WITH active AS (
       SELECT
         program_id,
         lower(trim(coalesce(nullif(trim(matched_name), ''), requested_name))) AS drug_key,
         coalesce(nullif(trim(matched_name), ''), requested_name) AS drug_label
       FROM chronic_med_lines
       WHERE is_active
         AND coalesce(nullif(trim(matched_name), ''), requested_name) IS NOT NULL
     ),
     labeled AS (
       SELECT DISTINCT ON (program_id, drug_key)
         program_id, drug_key, drug_label
       FROM active
       ORDER BY program_id, drug_key, drug_label
     )
     SELECT
       least(a.drug_label, b.drug_label) AS drug_a,
       greatest(a.drug_label, b.drug_label) AS drug_b,
       count(DISTINCT a.program_id)::text AS program_count
     FROM labeled a
     JOIN labeled b
       ON a.program_id = b.program_id
      AND a.drug_key < b.drug_key
     GROUP BY 1, 2
     HAVING count(DISTINCT a.program_id) >= 2
     ORDER BY count(DISTINCT a.program_id) DESC
     LIMIT $1`,
    [pairLimit]
  );

  const pairs: MedPair[] = pairsRes.rows.map((r) => ({
    drug_a: r.drug_a,
    drug_b: r.drug_b,
    program_count: Number(r.program_count) || 0,
    pct_of_programs:
      active_programs > 0
        ? Math.round((Number(r.program_count) / active_programs) * 1000) / 10
        : 0,
  }));

  const sizesRes = await query<{ med_count: string; program_count: string }>(
    `SELECT med_count::text, count(*)::text AS program_count
     FROM (
       SELECT cp.id, count(ml.id)::int AS med_count
       FROM chronic_programs cp
       LEFT JOIN chronic_med_lines ml ON ml.program_id = cp.id AND ml.is_active
       WHERE cp.status = 'active'
       GROUP BY cp.id
     ) t
     GROUP BY med_count
     ORDER BY med_count`
  );

  const regimen_sizes: RegimenSize[] = sizesRes.rows.map((r) => ({
    med_count: Number(r.med_count) || 0,
    program_count: Number(r.program_count) || 0,
  }));

  // Programs with 2+ meds for detail + flags
  const multiRes = await query<{
    program_id: string;
    program_code: string;
    employee_name: string;
    patient_name: string;
    meds: string;
    med_count: string;
  }>(
    `SELECT
       cp.id AS program_id,
       cp.program_code,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       count(ml.id)::text AS med_count,
       string_agg(
         coalesce(nullif(trim(ml.matched_name), ''), ml.requested_name),
         ' | ' ORDER BY ml.line_code
       ) AS meds
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     JOIN chronic_med_lines ml ON ml.program_id = cp.id AND ml.is_active
     WHERE cp.status = 'active'
     GROUP BY cp.id, cp.program_code, e.full_name, d.full_name
     HAVING count(ml.id) >= 2
     ORDER BY count(ml.id) DESC, cp.program_code
     LIMIT $1`,
    [multiLimit]
  );

  const flagCounts = new Map<string, { label: string; count: number }>();

  const multi_drug_programs: ProgramCombo[] = multiRes.rows.map((r) => {
    const meds = String(r.meds || '')
      .split('|')
      .map((s) => normalizeDrugLabel(s))
      .filter(Boolean);
    const flags: string[] = [];
    for (const rule of PATTERN_RULES) {
      if (rule.test(meds)) {
        flags.push(rule.flag);
        const prev = flagCounts.get(rule.flag) || { label: rule.label, count: 0 };
        prev.count += 1;
        flagCounts.set(rule.flag, prev);
      }
    }
    return {
      program_id: r.program_id,
      program_code: r.program_code,
      employee_name: r.employee_name,
      patient_name: r.patient_name,
      med_count: Number(r.med_count) || meds.length,
      meds,
      flags,
    };
  });

  const pattern_flags = Array.from(flagCounts.entries())
    .map(([flag, v]) => ({ flag, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);

  return {
    active_programs,
    programs_with_2plus,
    pairs,
    regimen_sizes,
    multi_drug_programs,
    pattern_flags,
  };
}
