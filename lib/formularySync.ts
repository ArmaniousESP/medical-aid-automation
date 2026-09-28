/**
 * Sync formulary_meds in Neon from:
 * 1) Existing chronic_med_lines (programs) — primary for this org
 * 2) Optional MSH search (HTTP often unavailable from Vercel SPA)
 */

import { query } from '@/lib/db';
import { mshSearchMedicines } from '@/lib/msh';

const SEED_QUERIES = [
  'Panadol',
  'Concor',
  'Glucophage',
  'Forxiga',
  'Crestor',
  'Januvia',
  'Plavix',
  'Amlodipine',
  'Augmentin',
  'Brufen',
  'Cataflam',
  'Zurcal',
  'Controloc',
  'Gliptus',
  'Blokatens',
  'Coxritor',
  'Donifoxate',
  'Uricol',
  'Lantus',
  'Ozempic',
  'Jardiance',
  'Xarelto',
  'Milga',
  'Thiotacid',
  'Diamicron',
  'Mellitofix',
];

export async function ensureFormularyTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS formulary_meds (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT,
      scientific_name TEXT,
      price NUMERIC,
      eva TEXT,
      canonical_id TEXT,
      manufacturer TEXT,
      source TEXT DEFAULT 'msh',
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS formulary_meds_name_uidx
    ON formulary_meds (lower(trim(name)))
  `).catch(() => undefined);
}

async function upsertRow(row: {
  name: string;
  name_ar?: string | null;
  scientific_name?: string | null;
  price?: number | null;
  eva?: string | null;
  canonical_id?: string | null;
  manufacturer?: string | null;
  source?: string;
}): Promise<'inserted' | 'updated' | 'skipped'> {
  const name = String(row.name || '').trim();
  if (!name) return 'skipped';
  const source = row.source || 'msh';

  const existing = await query<{ id: number }>(
    `SELECT id FROM formulary_meds WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1`,
    [name]
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE formulary_meds SET
         name_ar = COALESCE($2, name_ar),
         scientific_name = COALESCE($3, scientific_name),
         price = COALESCE($4, price),
         eva = COALESCE($5, eva),
         canonical_id = COALESCE($6, canonical_id),
         manufacturer = COALESCE($7, manufacturer),
         source = COALESCE($8, source),
         updated_at = now()
       WHERE id = $1`,
      [
        existing.rows[0].id,
        row.name_ar || null,
        row.scientific_name || null,
        row.price ?? null,
        row.eva || null,
        row.canonical_id || null,
        row.manufacturer || null,
        source,
      ]
    );
    return 'updated';
  }

  await query(
    `INSERT INTO formulary_meds
       (name, name_ar, scientific_name, price, eva, canonical_id, manufacturer, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      name,
      row.name_ar || null,
      row.scientific_name || null,
      row.price ?? null,
      row.eva || null,
      row.canonical_id || null,
      row.manufacturer || null,
      source,
    ]
  );
  return 'inserted';
}

/** Pull distinct med names from enrolled programs into formulary */
export async function syncFormularyFromPrograms(): Promise<{
  inserted: number;
  updated: number;
  scanned: number;
}> {
  await ensureFormularyTable();
  const res = await query<{ name: string; preferred: boolean; flag: string | null }>(
    `SELECT COALESCE(matched_name, requested_name) AS name,
            bool_or(company_preferred) AS preferred,
            max(formulary_flag) AS flag
     FROM chronic_med_lines
     WHERE COALESCE(matched_name, requested_name) IS NOT NULL
       AND length(trim(COALESCE(matched_name, requested_name))) > 2
     GROUP BY 1
     ORDER BY count(*) DESC
     LIMIT 2000`
  );

  let inserted = 0;
  let updated = 0;
  for (const row of res.rows) {
    const eva =
      row.flag === 'EVA_PREFERRED' || row.preferred ? 'EVA' : null;
    const r = await upsertRow({
      name: row.name,
      eva,
      source: 'programs',
    });
    if (r === 'inserted') inserted++;
    if (r === 'updated') updated++;
  }
  return { inserted, updated, scanned: res.rows.length };
}

export async function syncFormularyFromMsh(options?: {
  queries?: string[];
  limitPerQuery?: number;
}): Promise<{
  ok: boolean;
  queries: number;
  inserted: number;
  updated: number;
  total: number;
  from_programs?: { inserted: number; updated: number; scanned: number };
  errors: string[];
}> {
  await ensureFormularyTable();

  // Always refresh from local programs first (reliable)
  const fromPrograms = await syncFormularyFromPrograms();

  const queries = options?.queries?.length ? options.queries : SEED_QUERIES;
  const limitPerQuery = options?.limitPerQuery ?? 5;

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const { ok, items, error } = await mshSearchMedicines(q, limitPerQuery);
      if (!ok && error) errors.push(`${q}: ${error}`);
      for (const item of items) {
        const name = item.name_en || item.name_ar;
        if (!name) continue;
        const r = await upsertRow({
          name,
          name_ar: item.name_ar,
          scientific_name: item.scientific_name,
          price: item.price_egp != null ? Number(item.price_egp) : null,
          canonical_id:
            item.canonical_id != null
              ? String(item.canonical_id)
              : item.id || null,
          manufacturer: item.manufacturer,
          source: 'msh',
        });
        if (r === 'inserted') inserted++;
        if (r === 'updated') updated++;

        // short brand alias
        const alias = q.trim();
        if (alias.length >= 3 && alias.toLowerCase() !== name.toLowerCase()) {
          const ar = await upsertRow({
            name: alias,
            name_ar: item.name_ar,
            scientific_name: item.scientific_name,
            price: item.price_egp != null ? Number(item.price_egp) : null,
            canonical_id:
              item.canonical_id != null
                ? String(item.canonical_id)
                : item.id || null,
            manufacturer: item.manufacturer,
            source: 'msh',
          });
          if (ar === 'inserted') inserted++;
          if (ar === 'updated') updated++;
        }
      }
    } catch (e: unknown) {
      errors.push(`${q}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  const count = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM formulary_meds`
  );

  return {
    ok: true, // programs sync is enough for ops
    queries: queries.length,
    inserted: inserted + fromPrograms.inserted,
    updated: updated + fromPrograms.updated,
    total: Number(count.rows[0]?.n || 0),
    from_programs: fromPrograms,
    errors: errors.slice(0, 20),
  };
}

export async function formularyCount(): Promise<number> {
  try {
    const r = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM formulary_meds`
    );
    return Number(r.rows[0]?.n || 0);
  } catch {
    return 0;
  }
}

export async function listFormulary(opts?: {
  q?: string;
  evaOnly?: boolean;
  limit?: number;
}): Promise<
  {
    id: number;
    name: string;
    name_ar: string | null;
    price: string | null;
    eva: string | null;
    source: string | null;
  }[]
> {
  const limit = Math.min(opts?.limit || 100, 500);
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts?.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(`(name ILIKE $${params.length} OR name_ar ILIKE $${params.length})`);
  }
  if (opts?.evaOnly) {
    where.push(`eva IS NOT NULL AND trim(eva) <> ''`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit);
  const res = await query<{ 
    id: number;
    name: string;
    name_ar: string | null;
    price: string | null;
    eva: string | null;
    source: string | null;
  }>(
    `SELECT id, name, name_ar, price::text, eva, source
     FROM formulary_meds
     ${whereSql}
     ORDER BY name
     LIMIT $${params.length}`,
    params
  );
  return res.rows;
}
