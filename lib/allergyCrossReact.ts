/**
 * Drug allergy cross-reactivity — ops triage rules (not clinical CDS).
 *
 * Based on common practice-parameter themes:
 * - Beta-lactams: side-chain driven; amino-penicillins ↔ amino-cephalosporins higher risk
 * - Sulfa antibiotics vs non-antibiotic sulfonamides (lower clinical cross-react)
 * - NSAID class hypersensitivity
 * - Opioid class, etc.
 *
 * Always confirm with clinician / allergist for severe history.
 */

import { query } from '@/lib/db';
import { normalizeDrugName } from '@/lib/ddinter';
import { expandDrugTokens } from '@/lib/drugSynonyms';

export type AllergySeverity = 'unknown' | 'mild' | 'moderate' | 'severe' | 'anaphylaxis';

export type CrossHit = {
  allergy_label: string;
  allergy_class: string;
  med_name: string;
  med_ingredient: string | null;
  risk: 'high' | 'moderate' | 'low' | 'info';
  rule_id: string;
  message: string;
};

/** Ingredient / token → allergy class tags */
const INGREDIENT_CLASSES: Array<{ classId: string; patterns: RegExp[] }> = [
  {
    classId: 'penicillin',
    patterns: [
      /^penicillin/,
      /^amoxicillin/,
      /^ampicillin/,
      /^flucloxacillin/,
      /^cloxacillin/,
      /^piperacillin/,
      /^ticarcillin/,
      /^benzylpenicillin/,
      /^phenoxymethylpenicillin/,
    ],
  },
  {
    classId: 'amino_penicillin',
    patterns: [/^amoxicillin/, /^ampicillin/],
  },
  {
    classId: 'cephalosporin',
    patterns: [/^cef/, /^ceph/],
  },
  {
    classId: 'amino_cephalosporin',
    patterns: [
      /^cephalexin/,
      /^cefalexin/,
      /^cefadroxil/,
      /^cefprozil/,
      /^cefaclor/,
    ],
  },
  {
    classId: 'carbapenem',
    patterns: [/^imipenem/, /^meropenem/, /^ertapenem/, /^doripenem/],
  },
  {
    classId: 'monobactam',
    patterns: [/^aztreonam/],
  },
  {
    classId: 'sulfa_antibiotic',
    patterns: [
      /^sulfamethoxazole/,
      /^sulfadiazine/,
      /^sulfasalazine/,
      /^trimethoprim/, // often co-formulated; flag info with septrin/bactrim
    ],
  },
  {
    classId: 'nsaid',
    patterns: [
      /^ibuprofen/,
      /^diclofenac/,
      /^naproxen/,
      /^ketoprofen/,
      /^indomethacin/,
      /^celecoxib/,
      /^etoricoxib/,
      /^meloxicam/,
      /^piroxicam/,
      /^aspirin/,
      /^acetylsalicylic/,
    ],
  },
  {
    classId: 'opioid',
    patterns: [
      /^morphine/,
      /^codeine/,
      /^tramadol/,
      /^oxycodone/,
      /^fentanyl/,
      /^pethidine/,
      /^meperidine/,
    ],
  },
  {
    classId: 'quinolone',
    patterns: [/^ciprofloxacin/, /^levofloxacin/, /^moxifloxacin/, /^norfloxacin/, /^ofloxacin/],
  },
  {
    classId: 'macrolide',
    patterns: [/^azithromycin/, /^clarithromycin/, /^erythromycin/, /^roxithromycin/],
  },
  {
    classId: 'tetracycline',
    patterns: [/^doxycycline/, /^tetracycline/, /^minocycline/],
  },
  {
    classId: 'statin',
    patterns: [/^atorvastatin/, /^rosuvastatin/, /^simvastatin/, /^pravastatin/],
  },
  {
    classId: 'ace_inhibitor',
    patterns: [/pril$/],
  },
  {
    classId: 'arb',
    patterns: [/sartan$/],
  },
];

/** Allergy free-text / class label → class ids */
const ALLERGY_LABEL_TO_CLASSES: Array<{ patterns: RegExp[]; classes: string[] }> = [
  {
    patterns: [/penicillin/, /amoxil/, /augmentin/, /ampicillin/, /فلوسيل/, /بنسلين/],
    classes: ['penicillin', 'amino_penicillin'],
  },
  {
    patterns: [/cephalosporin/, /cefixax/, /keflex/, /cephalexin/, /سيفا/],
    classes: ['cephalosporin', 'amino_cephalosporin'],
  },
  {
    patterns: [/sulfa/, /sulfonamide/, /bactrim/, /septrin/, /co-?trimoxazole/, /سلفا/],
    classes: ['sulfa_antibiotic'],
  },
  {
    patterns: [/aspirin/, /nsaid/, /ibuprofen/, /brufen/, /voltaren/, /diclofenac/, /aspirin/],
    classes: ['nsaid'],
  },
  {
    patterns: [/codeine/, /morphine/, /opioid/, /tramadol/],
    classes: ['opioid'],
  },
  {
    patterns: [/quinolone/, /cipro/, /levoflox/],
    classes: ['quinolone'],
  },
  {
    patterns: [/macrolide/, /azithro/, /zithromax/, /clarithro/],
    classes: ['macrolide'],
  },
  {
    patterns: [/carbapenem/, /meropenem/, /imipenem/],
    classes: ['carbapenem'],
  },
];

type Rule = {
  id: string;
  allergyClasses: string[];
  medClasses: string[];
  risk: CrossHit['risk'];
  message: string;
};

const RULES: Rule[] = [
  {
    id: 'same_penicillin_class',
    allergyClasses: ['penicillin', 'amino_penicillin'],
    medClasses: ['penicillin', 'amino_penicillin'],
    risk: 'high',
    message:
      'Same penicillin class as documented allergy — avoid unless de-labelled by allergist.',
  },
  {
    id: 'amino_penicillin_amino_ceph',
    allergyClasses: ['amino_penicillin', 'penicillin'],
    medClasses: ['amino_cephalosporin'],
    risk: 'moderate',
    message:
      'Shared side-chain risk (amino-penicillin ↔ amino-cephalosporin). Prefer dissimilar cephalosporin; clinical review advised.',
  },
  {
    id: 'penicillin_any_ceph',
    allergyClasses: ['penicillin', 'amino_penicillin'],
    medClasses: ['cephalosporin'],
    risk: 'low',
    message:
      'Penicillin allergy label + cephalosporin: true cross-reactivity often <2% if side chains differ; still flag for review if severe/anaphylaxis history.',
  },
  {
    id: 'penicillin_carbapenem',
    allergyClasses: ['penicillin', 'amino_penicillin'],
    medClasses: ['carbapenem'],
    risk: 'low',
    message:
      'Carbapenems usually low cross-react with penicillin; use with caution if severe IgE history.',
  },
  {
    id: 'ceph_class',
    allergyClasses: ['cephalosporin', 'amino_cephalosporin'],
    medClasses: ['cephalosporin', 'amino_cephalosporin'],
    risk: 'high',
    message: 'Cephalosporin class overlap with documented cephalosporin allergy.',
  },
  {
    id: 'sulfa_abx',
    allergyClasses: ['sulfa_antibiotic'],
    medClasses: ['sulfa_antibiotic'],
    risk: 'high',
    message: 'Sulfonamide antibiotic class — avoid related antibiotic sulfa products.',
  },
  {
    id: 'nsaid_class',
    allergyClasses: ['nsaid'],
    medClasses: ['nsaid'],
    risk: 'high',
    message:
      'NSAID / aspirin hypersensitivity class — cross-reactivity common within NSAIDs; specialist advice if asthma/nasal polyps.',
  },
  {
    id: 'opioid_class',
    allergyClasses: ['opioid'],
    medClasses: ['opioid'],
    risk: 'moderate',
    message:
      'Opioid class flag — true IgE cross-reactivity uncommon; distinguish side-effect vs allergy.',
  },
  {
    id: 'quinolone_class',
    allergyClasses: ['quinolone'],
    medClasses: ['quinolone'],
    risk: 'high',
    message: 'Fluoroquinolone class — avoid other quinolones if true allergy.',
  },
  {
    id: 'macrolide_class',
    allergyClasses: ['macrolide'],
    medClasses: ['macrolide'],
    risk: 'moderate',
    message: 'Macrolide class overlap.',
  },
];

export function classifyIngredient(ingredientNorm: string): string[] {
  const tags: string[] = [];
  for (const row of INGREDIENT_CLASSES) {
    if (row.patterns.some((p) => p.test(ingredientNorm))) {
      tags.push(row.classId);
    }
  }
  return tags;
}

export function allergyLabelToClasses(label: string): string[] {
  const n = normalizeDrugName(label);
  const raw = label.toLowerCase();
  const tags = new Set<string>();
  for (const row of ALLERGY_LABEL_TO_CLASSES) {
    if (row.patterns.some((p) => p.test(n) || p.test(raw))) {
      row.classes.forEach((c) => tags.add(c));
    }
  }
  // Also treat exact ingredient words as classes via classifyIngredient
  for (const t of classifyIngredient(n)) tags.add(t);
  return [...tags];
}

export async function ensureAllergyTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS patient_allergies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dependent_id UUID NOT NULL,
      allergen_label TEXT NOT NULL,
      allergen_norm TEXT NOT NULL,
      severity TEXT DEFAULT 'unknown',
      reaction_note TEXT,
      source TEXT DEFAULT 'manual',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
  try {
    await query(
      `CREATE INDEX IF NOT EXISTS idx_patient_allergies_dep ON patient_allergies (dependent_id)`
    );
  } catch {
    /* */
  }
}

export async function listAllergiesForDependent(dependentId: string) {
  await ensureAllergyTables();
  const res = await query(
    `SELECT * FROM patient_allergies
     WHERE dependent_id = $1 AND is_active
     ORDER BY created_at DESC`,
    [dependentId]
  );
  return res.rows;
}

export async function addAllergy(input: {
  dependentId: string;
  allergenLabel: string;
  severity?: string;
  reactionNote?: string;
  source?: string;
}) {
  await ensureAllergyTables();
  const allergen_norm = normalizeDrugName(input.allergenLabel);
  const res = await query(
    `INSERT INTO patient_allergies (
       dependent_id, allergen_label, allergen_norm, severity, reaction_note, source
     ) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      input.dependentId,
      input.allergenLabel.trim(),
      allergen_norm,
      input.severity || 'unknown',
      input.reactionNote || null,
      input.source || 'manual',
    ]
  );
  return res.rows[0];
}

export async function deactivateAllergy(id: string) {
  await ensureAllergyTables();
  await query(
    `UPDATE patient_allergies SET is_active = false, updated_at = now() WHERE id = $1`,
    [id]
  );
}

export async function checkMedsAgainstAllergies(
  allergies: Array<{ allergen_label: string; severity?: string }>,
  medNames: string[]
): Promise<{
  hits: CrossHit[];
  meds_resolved: Array<{ original: string; ingredient: string | null; classes: string[] }>;
}> {
  const hits: CrossHit[] = [];
  const seen = new Set<string>();
  const meds_resolved: Array<{
    original: string;
    ingredient: string | null;
    classes: string[];
  }> = [];

  const allergyParsed = allergies.map((a) => ({
    label: a.allergen_label,
    severity: (a.severity || 'unknown').toLowerCase(),
    classes: allergyLabelToClasses(a.allergen_label),
  }));

  for (const med of medNames) {
    const exp = await expandDrugTokens(med);
    const tokens = exp.tokens;
    const classes = new Set<string>();
    for (const t of tokens) {
      for (const c of classifyIngredient(t)) classes.add(c);
    }
    if (exp.resolved_ingredient) {
      for (const c of classifyIngredient(exp.resolved_ingredient))
        classes.add(c);
    }
    const classList = [...classes];
    meds_resolved.push({
      original: med,
      ingredient: exp.resolved_ingredient,
      classes: classList,
    });

    for (const all of allergyParsed) {
      // Direct name overlap
      const allNorm = normalizeDrugName(all.label);
      if (
        tokens.some(
          (t) => t === allNorm || t.includes(allNorm) || allNorm.includes(t)
        ) &&
        allNorm.length > 2
      ) {
        const key = `direct|${all.label}|${med}`;
        if (!seen.has(key)) {
          seen.add(key);
          hits.push({
            allergy_label: all.label,
            allergy_class: all.classes.join(',') || 'direct',
            med_name: med,
            med_ingredient: exp.resolved_ingredient,
            risk: 'high',
            rule_id: 'direct_match',
            message: 'Medication name/ingredient matches documented allergen.',
          });
        }
      }

      for (const rule of RULES) {
        const allergyHit = rule.allergyClasses.some((c) =>
          all.classes.includes(c)
        );
        const medHit = rule.medClasses.some((c) => classList.includes(c));
        if (!allergyHit || !medHit) continue;

        // Escalate if anaphylaxis history
        let risk = rule.risk;
        if (
          (all.severity === 'anaphylaxis' || all.severity === 'severe') &&
          risk === 'low'
        ) {
          risk = 'moderate';
        }

        const key = `${rule.id}|${all.label}|${med}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          allergy_label: all.label,
          allergy_class: all.classes.join(','),
          med_name: med,
          med_ingredient: exp.resolved_ingredient,
          risk,
          rule_id: rule.id,
          message: rule.message,
        });
      }
    }
  }

  const order = { high: 0, moderate: 1, low: 2, info: 3 };
  hits.sort(
    (a, b) => (order[a.risk] ?? 9) - (order[b.risk] ?? 9)
  );

  return { hits, meds_resolved };
}

export async function checkProgramAllergies(programId: string) {
  const prog = await query<{ dependent_id: string }>(
    `SELECT dependent_id FROM chronic_programs WHERE id = $1`,
    [programId]
  );
  if (!prog.rows[0]) throw new Error('Program not found');
  const dependentId = prog.rows[0].dependent_id;

  const allergies = await listAllergiesForDependent(dependentId);
  const meds = await query<{ name: string }>(
    `SELECT coalesce(nullif(trim(matched_name), ''), requested_name) AS name
     FROM chronic_med_lines WHERE program_id = $1 AND is_active`,
    [programId]
  );
  const names = meds.rows.map((r) => r.name).filter(Boolean);
  const result = await checkMedsAgainstAllergies(
    allergies.map((a: any) => ({
      allergen_label: a.allergen_label,
      severity: a.severity,
    })),
    names
  );

  return {
    dependent_id: dependentId,
    allergies,
    ...result,
  };
}
