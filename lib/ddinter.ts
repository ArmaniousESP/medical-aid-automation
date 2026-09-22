/**
 * DDInter 2.0 drug–drug interaction integration
 * Source: https://ddinter2.scbdd.com (CC BY-NC-SA 4.0)
 * CSV columns: DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
 *
 * Ops triage only — not a substitute for licensed clinical CDS.
 */

import { query } from '@/lib/db';

export const DDINTER_CSV_URLS: Array<{ code: string; url: string }> = [
  {
    code: 'A',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_A.csv',
  },
  {
    code: 'B',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_B.csv',
  },
  {
    code: 'D',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_D.csv',
  },
  {
    code: 'H',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_H.csv',
  },
  {
    code: 'L',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_L.csv',
  },
  {
    code: 'P',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_P.csv',
  },
  {
    code: 'R',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_R.csv',
  },
  {
    code: 'V',
    url: 'https://ddinter2.scbdd.com/static/media/download/ddinter_downloads_code_V.csv',
  },
];

export function normalizeDrugName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s\-]/g, '')
    .trim();
}

/** Extract likely generic token for matching (first meaningful word) */
export function drugTokens(name: string): string[] {
  const n = normalizeDrugName(name);
  if (!n) return [];
  const parts = n.split(/[\s\/\+,]+/).filter((p) => p.length > 2);
  // Prefer longer tokens first for matching
  return [...new Set([n, ...parts])].sort((a, b) => b.length - a.length);
}

export async function ensureDdinterTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS ddinter_pairs (
      id BIGSERIAL PRIMARY KEY,
      drug_a_norm TEXT NOT NULL,
      drug_b_norm TEXT NOT NULL,
      drug_a TEXT NOT NULL,
      drug_b TEXT NOT NULL,
      level TEXT NOT NULL,
      source_file TEXT
    )`);
  try {
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_ddinter_pair
       ON ddinter_pairs (drug_a_norm, drug_b_norm, level)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_ddinter_a ON ddinter_pairs (drug_a_norm)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_ddinter_b ON ddinter_pairs (drug_b_norm)`
    );
  } catch {
    /* exists */
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

export async function importDdinterFromCsvText(
  text: string,
  sourceFile: string
): Promise<{ inserted: number; skipped: number }> {
  await ensureDdinterTables();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let inserted = 0;
  let skipped = 0;
  const batch: Array<[string, string, string, string, string, string]> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /Drug_A/i.test(line)) continue;
    const cols = parseCsvLine(line);
    if (cols.length < 5) {
      skipped += 1;
      continue;
    }
    const drugA = cols[1];
    const drugB = cols[3];
    const level = cols[4] || 'Unknown';
    const aNorm = normalizeDrugName(drugA);
    const bNorm = normalizeDrugName(drugB);
    if (!aNorm || !bNorm || aNorm === bNorm) {
      skipped += 1;
      continue;
    }
    // Canonical order for unique constraint
    const [na, nb, la, lb] =
      aNorm < bNorm
        ? [aNorm, bNorm, drugA, drugB]
        : [bNorm, aNorm, drugB, drugA];
    batch.push([na, nb, la, lb, level, sourceFile]);

    if (batch.length >= 200) {
      inserted += await flushBatch(batch);
      batch.length = 0;
    }
  }
  if (batch.length) inserted += await flushBatch(batch);
  return { inserted, skipped };
}

async function flushBatch(
  batch: Array<[string, string, string, string, string, string]>
): Promise<number> {
  // Multi-row insert with ON CONFLICT DO NOTHING
  const values: unknown[] = [];
  const placeholders: string[] = [];
  batch.forEach((row, i) => {
    const base = i * 6;
    placeholders.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`
    );
    values.push(...row);
  });
  try {
    const res = await query(
      `INSERT INTO ddinter_pairs (drug_a_norm, drug_b_norm, drug_a, drug_b, level, source_file)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (drug_a_norm, drug_b_norm, level) DO NOTHING`,
      values
    );
    return res.rowCount ?? 0;
  } catch (e) {
    // Fallback row-by-row if unique index missing
    let n = 0;
    for (const row of batch) {
      try {
        await query(
          `INSERT INTO ddinter_pairs (drug_a_norm, drug_b_norm, drug_a, drug_b, level, source_file)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          row
        );
        n += 1;
      } catch {
        /* skip */
      }
    }
    return n;
  }
}

export async function importAllDdinterFiles(opts?: {
  codes?: string[];
}): Promise<{
  files: Array<{ code: string; inserted: number; skipped: number; error?: string }>;
  total_inserted: number;
}> {
  const codes = opts?.codes;
  const files = DDINTER_CSV_URLS.filter(
    (f) => !codes || codes.includes(f.code)
  );
  const results: Array<{
    code: string;
    inserted: number;
    skipped: number;
    error?: string;
  }> = [];
  let total = 0;

  for (const f of files) {
    try {
      const res = await fetch(f.url, {
        headers: { 'User-Agent': 'medical-aid-automation/1.0' },
      });
      if (!res.ok) {
        results.push({
          code: f.code,
          inserted: 0,
          skipped: 0,
          error: `HTTP ${res.status}`,
        });
        continue;
      }
      const text = await res.text();
      const r = await importDdinterFromCsvText(text, f.code);
      total += r.inserted;
      results.push({ code: f.code, ...r });
    } catch (e: unknown) {
      results.push({
        code: f.code,
        inserted: 0,
        skipped: 0,
        error: e instanceof Error ? e.message : 'fetch failed',
      });
    }
  }

  return { files: results, total_inserted: total };
}

export type DdiHit = {
  drug_a: string;
  drug_b: string;
  level: string;
  matched_via: string;
};

/**
 * Check all pairs among a list of drug names against imported DDInter pairs.
 * Uses token expansion so "Metformin 500" can match "Metformin".
 */
export async function checkInteractions(
  drugNames: string[]
): Promise<{ hits: DdiHit[]; drugs_checked: string[]; pair_db_count: number }> {
  await ensureDdinterTables();

  const countRes = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM ddinter_pairs`
  );
  const pair_db_count = Number(countRes.rows[0]?.n || 0);

  const cleaned = [...new Set(drugNames.map((d) => d.trim()).filter(Boolean))];
  if (cleaned.length < 2 || pair_db_count === 0) {
    return { hits: [], drugs_checked: cleaned, pair_db_count };
  }

  // Build token set per input drug
  const drugTokensMap = cleaned.map((d) => ({
    original: d,
    tokens: drugTokens(d),
  }));

  const allTokens = [
    ...new Set(drugTokensMap.flatMap((d) => d.tokens)),
  ];

  // Fetch candidate pairs where either side matches any token (prefix/exact)
  // Use exact norm match on tokens for performance
  const res = await query<{
    drug_a: string;
    drug_b: string;
    drug_a_norm: string;
    drug_b_norm: string;
    level: string;
  }>(
    `SELECT drug_a, drug_b, drug_a_norm, drug_b_norm, level
     FROM ddinter_pairs
     WHERE drug_a_norm = ANY($1::text[])
        OR drug_b_norm = ANY($1::text[])
        OR drug_a_norm LIKE ANY(
             (SELECT array_agg(t || '%') FROM unnest($1::text[]) AS t)
           )
        OR drug_b_norm LIKE ANY(
             (SELECT array_agg(t || '%') FROM unnest($1::text[]) AS t)
           )`,
    [allTokens]
  ).catch(async () => {
    // Simpler fallback if array_agg fails
    return query<{{
      drug_a: string;
      drug_b: string;
      drug_a_norm: string;
      drug_b_norm: string;
      level: string;
    }>(
      `SELECT drug_a, drug_b, drug_a_norm, drug_b_norm, level
       FROM ddinter_pairs
       WHERE drug_a_norm = ANY($1::text[]) OR drug_b_norm = ANY($1::text[])`,
      [allTokens]
    );
  });

  const hits: DdiHit[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < drugTokensMap.length; i++) {
    for (let j = i + 1; j < drugTokensMap.length; j++) {
      const A = drugTokensMap[i];
      const B = drugTokensMap[j];
      for (const row of res.rows) {
        const aMatch =
          A.tokens.some(
            (t) =>
              row.drug_a_norm === t ||
              row.drug_a_norm.startsWith(t + ' ') ||
              t.startsWith(row.drug_a_norm)
          ) ||
          B.tokens.some(
            (t) =>
              row.drug_a_norm === t ||
              row.drug_a_norm.startsWith(t + ' ') ||
              t.startsWith(row.drug_a_norm)
          );
        const bMatch =
          A.tokens.some(
            (t) =>
              row.drug_b_norm === t ||
              row.drug_b_norm.startsWith(t + ' ') ||
              t.startsWith(row.drug_b_norm)
          ) ||
          B.tokens.some(
            (t) =>
              row.drug_b_norm === t ||
              row.drug_b_norm.startsWith(t + ' ') ||
              t.startsWith(row.drug_b_norm)
          );

        // Require one side matching A and the other matching B
        const aOnA = A.tokens.some(
          (t) => row.drug_a_norm === t || row.drug_a_norm.startsWith(t)
        );
        const bOnB = B.tokens.some(
          (t) => row.drug_b_norm === t || row.drug_b_norm.startsWith(t)
        );
        const aOnB = A.tokens.some(
          (t) => row.drug_b_norm === t || row.drug_b_norm.startsWith(t)
        );
        const bOnA = B.tokens.some(
          (t) => row.drug_a_norm === t || row.drug_a_norm.startsWith(t)
        );

        if ((aOnA && bOnB) || (aOnB && bOnA)) {
          const key = `${row.drug_a_norm}|${row.drug_b_norm}|${row.level}`;
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({
            drug_a: row.drug_a,
            drug_b: row.drug_b,
            level: row.level,
            matched_via: `${A.original} × ${B.original}`,
          });
        }
      }
    }
  }

  const order = { Major: 0, Moderate: 1, Minor: 2 };
  hits.sort(
    (a, b) =>
      (order[a.level as keyof typeof order] ?? 9) -
      (order[b.level as keyof typeof order] ?? 9)
  );

  return { hits, drugs_checked: cleaned, pair_db_count };
}

export async function checkProgramInteractions(programId: string) {
  const meds = await query<{ name: string }>(
    `SELECT coalesce(nullif(trim(matched_name), ''), requested_name) AS name
     FROM chronic_med_lines
     WHERE program_id = $1 AND is_active`,
    [programId]
  );
  const names = meds.rows.map((r) => r.name).filter(Boolean);
  return checkInteractions(names);
}

export async function ddinterStats() {
  await ensureDdinterTables();
  const res = await query<{ n: string; majors: string; sources: string }>(
    `SELECT
       count(*)::text AS n,
       count(*) FILTER (WHERE lower(level) = 'major')::text AS majors,
       count(DISTINCT source_file)::text AS sources
     FROM ddinter_pairs`
  );
  const r = res.rows[0];
  return {
    pairs: Number(r?.n || 0),
    major: Number(r?.majors || 0),
    source_files: Number(r?.sources || 0),
  };
}
