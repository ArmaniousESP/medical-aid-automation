/**
 * Sync formulary_meds in Neon from MSH catalog searches.
 * Used by processPlatformIntake matching (loadMedDbFromNeon).
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
  'GABIMASH',
  'Ator',
  'Lipitor',
  'Cozaar',
  'Diovan',
  'Nexium',
  'Omeprazole',
  'Metformin',
  'Insulin',
  'Lantus',
  'NovoRapid',
  'Trajenta',
  'Jardiance',
  'Xarelto',
  'Clexane',
  'Aspirin',
  'Cardicor',
  'Nebilet',
  'Zestril',
  'Coveram',
  'Exforge',
  'Blokatens',
  'Coxilor',
  'Fulprazole',
  'Uricol',
  'Gliptus',
  'Wegovy',
  'Ozempic',
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
}): Promise<'inserted' | 'updated' | 'skipped'> {
  const name = String(row.name || '').trim();
  if (!name) return 'skipped';

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
         source = 'msh',
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
      ]
    );
    return 'updated';
  }

  await query(
    `INSERT INTO formulary_meds
       (name, name_ar, scientific_name, price, eva, canonical_id, manufacturer, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'msh')`,
    [
      name,
      row.name_ar || null,
      row.scientific_name || null,
      row.price ?? null,
      row.eva || null,
      row.canonical_id || null,
      row.manufacturer || null,
    ]
  );
  return 'inserted';
}

/** Also store short brand alias for better fuzzy match (e.g. "Concor 5") */
function brandAlias(fullName: string, query: string): string | null {
  const q = query.trim();
  if (!q || q.length < 3) return null;
  if (fullName.toLowerCase().includes(q.toLowerCase())) {
    return q;
  }
  return null;
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
  errors: string[];
}> {
  await ensureFormularyTable();

  const queries = options?.queries?.length
    ? options.queries
    : SEED_QUERIES;
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
        });
        if (r === 'inserted') inserted++;
        if (r === 'updated') updated++;

        const alias = brandAlias(name, q);
        if (alias && alias.toLowerCase() !== name.toLowerCase()) {
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
    ok: errors.length === 0,
    queries: queries.length,
    inserted,
    updated,
    total: Number(count.rows[0]?.n || 0),
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
