import { query } from '@/lib/db';
import { loadEgyptianDrugs, type EgSearchItem } from '@/lib/egyptianDrugs';

export async function ensureEgyptianDrugsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS egyptian_drugs (
      id bigserial PRIMARY KEY,
      commercial_name_en text NOT NULL,
      commercial_name_ar text,
      scientific_name text,
      manufacturer text,
      drug_class text,
      route text,
      price_egp numeric(12, 2),
      source text NOT NULL DEFAULT 'karem505/egyptian-drug-database',
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (commercial_name_en)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS egyptian_drugs_en_lower_idx
      ON egyptian_drugs (lower(commercial_name_en))
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS egyptian_drugs_sci_lower_idx
      ON egyptian_drugs (lower(scientific_name))
  `);
}

export async function egyptianDrugCount(): Promise<number> {
  try {
    const r = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM egyptian_drugs`
    );
    return Number(r.rows[0]?.n || 0);
  } catch {
    return 0;
  }
}

/** Upsert a slice of the GitHub CSV into Neon. Repeat with next_offset until done. */
export async function syncEgyptianCatalog(opts?: {
  offset?: number;
  batch?: number;
  maxMs?: number;
}) {
  await ensureEgyptianDrugsTable();
  const drugs = await loadEgyptianDrugs();
  const batch = Math.min(Math.max(opts?.batch || 800, 100), 1500);
  const maxMs = opts?.maxMs || 45_000;
  let offset = Math.max(opts?.offset || 0, 0);
  const started = Date.now();
  let upserted = 0;

  while (offset < drugs.length && Date.now() - started < maxMs) {
    const slice = drugs.slice(offset, offset + batch);
    if (!slice.length) break;
    const ens = slice.map((d) => d.commercial_name_en);
    const ars = slice.map((d) => d.commercial_name_ar || null);
    const scis = slice.map((d) => d.scientific_name || null);
    const mfrs = slice.map((d) => d.manufacturer || null);
    const classes = slice.map((d) => d.drug_class || null);
    const routes = slice.map((d) => d.route || null);
    const prices = slice.map((d) => d.price_egp);
    await query(
      `INSERT INTO egyptian_drugs (
         commercial_name_en, commercial_name_ar, scientific_name,
         manufacturer, drug_class, route, price_egp, source, updated_at
       )
       SELECT * FROM unnest(
         $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::numeric[]
       ) AS t(en, ar, sci, mfr, cls, route, price)
       CROSS JOIN (SELECT 'karem505/egyptian-drug-database'::text AS source, now() AS updated_at) s
       ON CONFLICT (commercial_name_en) DO UPDATE SET
         commercial_name_ar = EXCLUDED.commercial_name_ar,
         scientific_name = EXCLUDED.scientific_name,
         manufacturer = EXCLUDED.manufacturer,
         drug_class = EXCLUDED.drug_class,
         route = EXCLUDED.route,
         price_egp = EXCLUDED.price_egp,
         updated_at = now()`,
      [ens, ars, scis, mfrs, classes, routes, prices]
    );
    upserted += slice.length;
    offset += slice.length;
  }

  const total = await egyptianDrugCount();
  return {
    ok: true,
    catalog_size: drugs.length,
    upserted,
    next_offset: offset < drugs.length ? offset : null,
    done: offset >= drugs.length,
    stored: total,
    source: 'karem505/egyptian-drug-database',
  };
}

export async function searchEgyptianDrugsDb(
  q: string,
  limit = 8
): Promise<{ ok: boolean; items: EgSearchItem[]; total?: number }> {
  const nq = q.trim();
  if (!nq) return { ok: true, items: [], total: 0 };
  const total = await egyptianDrugCount();
  if (!total) return { ok: true, items: [], total: 0 };
  const like = `%${nq.replace(/%/g, '')}%`;
  const prefix = `${nq.replace(/%/g, '')}%`;
  const r = await query<{
    commercial_name_en: string;
    commercial_name_ar: string | null;
    scientific_name: string | null;
    manufacturer: string | null;
    drug_class: string | null;
    route: string | null;
    price_egp: string | null;
  }>(
    `SELECT commercial_name_en, commercial_name_ar, scientific_name,
            manufacturer, drug_class, route, price_egp::text
     FROM egyptian_drugs
     WHERE lower(commercial_name_en) LIKE lower($1)
        OR lower(coalesce(commercial_name_ar, '')) LIKE lower($1)
        OR lower(coalesce(scientific_name, '')) LIKE lower($1)
     ORDER BY
       CASE WHEN lower(commercial_name_en) LIKE lower($2) THEN 0 ELSE 1 END,
       length(commercial_name_en)
     LIMIT $3`,
    [like, prefix, Math.min(limit, 40)]
  );
  return {
    ok: true,
    total,
    items: r.rows.map((row) => ({
      name_en: row.commercial_name_en,
      name_ar: row.commercial_name_ar || undefined,
      scientific_name: row.scientific_name || undefined,
      manufacturer: row.manufacturer || undefined,
      drug_class: row.drug_class || undefined,
      route: row.route || undefined,
      price_egp: row.price_egp != null ? Number(row.price_egp) : null,
      source: 'egyptian-drug-database' as const,
    })),
  };
}
