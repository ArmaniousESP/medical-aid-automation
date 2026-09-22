/**
 * Brand / trade → ingredient synonyms for DDInter matching.
 * Built-in Egypt-focused map + Neon `drug_synonyms` table overrides.
 */

import { query } from '@/lib/db';
import { normalizeDrugName } from '@/lib/ddinter';

/** alias (any case) → preferred DDInter-style generic name */
export const BUILTIN_SYNONYMS: Record<string, string> = {
  // Diabetes
  gliptus: 'sitagliptin',
  'gliptus plus': 'sitagliptin',
  januvia: 'sitagliptin',
  galvus: 'vildagliptin',
  trajenta: 'linagliptin',
  onglyza: 'saxagliptin',
  empixera: 'empagliflozin',
  jardiance: 'empagliflozin',
  forxiga: 'dapagliflozin',
  invokana: 'canagliflozin',
  glucophage: 'metformin',
  cidophage: 'metformin',
  diabetron: 'metformin',
  diamicron: 'gliclazide',
  amaryl: 'glimepiride',
  tresiba: 'insulin degludec',
  lantus: 'insulin glargine',
  toujeo: 'insulin glargine',
  levemir: 'insulin detemir',
  novorapid: 'insulin aspart',
  humalog: 'insulin lispro',
  apidra: 'insulin glulisine',
  mixtard: 'insulin',
  actrapid: 'insulin',
  // CV / lipid
  lipitor: 'atorvastatin',
  crestor: 'rosuvastatin',
  zocor: 'simvastatin',
  cozaar: 'losartan',
  diovan: 'valsartan',
  micardis: 'telmisartan',
  coversyl: 'perindopril',
  tritace: 'ramipril',
  norvasc: 'amlodipine',
  concor: 'bisoprolol',
  plavix: 'clopidogrel',
  cartia: 'aspirin',
  jusal: 'aspirin',
  aspocid: 'aspirin',
  // GI
  fulprazole: 'omeprazole',
  losec: 'omeprazole',
  nexium: 'esomeprazole',
  controloc: 'pantoprazole',
  // Respiratory / other from earlier cases
  blokatens: 'amlodipine',
  blokium: 'atenolol',
  coxritor: 'etoricoxib',
  coaxilor: 'etoricoxib',
  uricol: 'potassium citrate',
  'uricol plus': 'potassium citrate',
  uricodrop: 'febuxostat',
  donifoxate: 'febuxostat',
  wegovy: 'semaglutide',
  ozempic: 'semaglutide',
  rybelsus: 'semaglutide',
  // Common Egypt brands
  panadol: 'acetaminophen',
  paramol: 'acetaminophen',
  cetamol: 'acetaminophen',
  brufen: 'ibuprofen',
  cataflam: 'diclofenac',
  voltaren: 'diclofenac',
  augmentin: 'amoxicillin',
  zithromax: 'azithromycin',
  flagyl: 'metronidazole',
  concor: 'bisoprolol',
  atarax: 'hydroxyzine',
  xanax: 'alprazolam',
  prozac: 'fluoxetine',
  zoloft: 'sertraline',
  cipralex: 'escitalopram',
  lyrica: 'pregabalin',
  neurontin: 'gabapentin',
  lasix: 'furosemide',
  aldactone: 'spironolactone',
  septrin: 'sulfamethoxazole',
  bactrim: 'sulfamethoxazole',
};

export async function ensureSynonymTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS drug_synonyms (
      id SERIAL PRIMARY KEY,
      alias_norm TEXT NOT NULL UNIQUE,
      alias_display TEXT,
      ingredient_norm TEXT NOT NULL,
      ingredient_display TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
  try {
    await query(
      `CREATE INDEX IF NOT EXISTS idx_drug_syn_ingredient ON drug_synonyms (ingredient_norm)`
    );
  } catch {
    /* */
  }
}

let cache: Map<string, string> | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

export async function loadSynonymMap(): Promise<Map<string, string>> {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;

  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(BUILTIN_SYNONYMS)) {
    map.set(normalizeDrugName(k), normalizeDrugName(v));
  }

  try {
    await ensureSynonymTable();
    const res = await query<{ alias_norm: string; ingredient_norm: string }>(
      `SELECT alias_norm, ingredient_norm FROM drug_synonyms`
    );
    for (const r of res.rows) {
      map.set(r.alias_norm, r.ingredient_norm);
    }
  } catch {
    /* DB optional */
  }

  cache = map;
  cacheAt = Date.now();
  return map;
}

export function invalidateSynonymCache() {
  cache = null;
  cacheAt = 0;
}

/**
 * Expand a drug label into match tokens: original tokens + resolved ingredients.
 */
export async function expandDrugTokens(name: string): Promise<{
  original: string;
  tokens: string[];
  resolved_ingredient: string | null;
}> {
  const map = await loadSynonymMap();
  const norm = normalizeDrugName(name);
  const parts = norm.split(/[\s\/\+,]+/).filter((p) => p.length > 2);

  const tokens = new Set<string>();
  if (norm) tokens.add(norm);
  for (const p of parts) tokens.add(p);

  let resolved: string | null = null;

  // Full-string alias
  if (map.has(norm)) {
    resolved = map.get(norm)!;
    tokens.add(resolved);
    for (const p of resolved.split(/\s+/)) {
      if (p.length > 2) tokens.add(p);
    }
  }

  // First token / each part as brand
  for (const p of parts) {
    if (map.has(p)) {
      const ing = map.get(p)!;
      if (!resolved) resolved = ing;
      tokens.add(ing);
      for (const t of ing.split(/\s+/)) {
        if (t.length > 2) tokens.add(t);
      }
    }
  }

  // Prefix: "gliptus plus 50/1000" → try progressive trim
  if (!resolved && norm) {
    const words = norm.split(' ');
    for (let len = words.length; len >= 1; len--) {
      const key = words.slice(0, len).join(' ');
      if (map.has(key)) {
        resolved = map.get(key)!;
        tokens.add(resolved);
        break;
      }
    }
  }

  return {
    original: name,
    tokens: [...tokens].sort((a, b) => b.length - a.length),
    resolved_ingredient: resolved,
  };
}

export async function upsertSynonym(input: {
  alias: string;
  ingredient: string;
  source?: string;
}) {
  await ensureSynonymTable();
  const alias_norm = normalizeDrugName(input.alias);
  const ingredient_norm = normalizeDrugName(input.ingredient);
  if (!alias_norm || !ingredient_norm) {
    throw new Error('alias and ingredient required');
  }
  await query(
    `INSERT INTO drug_synonyms (alias_norm, alias_display, ingredient_norm, ingredient_display, source)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (alias_norm) DO UPDATE SET
       ingredient_norm = EXCLUDED.ingredient_norm,
       ingredient_display = EXCLUDED.ingredient_display,
       alias_display = EXCLUDED.alias_display,
       source = EXCLUDED.source`,
    [
      alias_norm,
      input.alias.trim(),
      ingredient_norm,
      input.ingredient.trim(),
      input.source || 'manual',
    ]
  );
  invalidateSynonymCache();
  return { alias_norm, ingredient_norm };
}

export async function listSynonyms(limit = 200) {
  await ensureSynonymTable();
  const res = await query(
    `SELECT id, alias_norm, alias_display, ingredient_norm, ingredient_display, source, created_at
     FROM drug_synonyms
     ORDER BY alias_norm
     LIMIT $1`,
    [Math.min(limit, 500)]
  );
  return res.rows;
}

export async function seedBuiltinSynonymsToDb(): Promise<number> {
  await ensureSynonymTable();
  let n = 0;
  for (const [alias, ingredient] of Object.entries(BUILTIN_SYNONYMS)) {
    await upsertSynonym({ alias, ingredient, source: 'builtin' });
    n += 1;
  }
  return n;
}

export function listBuiltinSynonyms() {
  return Object.entries(BUILTIN_SYNONYMS)
    .map(([alias, ingredient]) => ({ alias, ingredient }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
}
