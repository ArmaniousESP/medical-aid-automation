/**
 * DDInter 2.0 drug–drug interaction integration
 * Source: https://ddinter2.scbdd.com (CC BY-NC-SA 4.0)
 * CSV columns: DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level
 *
 * Ops triage only — not a substitute for licensed clinical CDS.
 */

import { query } from '@/lib/db';
import { expandDrugTokens } from '@/lib/drugSynonyms';
import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

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
  } catch {
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
  files: Array<{
    code: string;
    inserted: number;
    skipped: number;
    error?: string;
    fetch_attempts?: number;
  }>;
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
    fetch_attempts?: number;
  }> = [];
  let total = 0;
  const retry = {
    ...webhookRetryDefaults(),
    maxAttempts: Math.max(webhookRetryDefaults().maxAttempts ?? 3, 3),
  };

  for (const f of files) {
    try {
      const { response, attempts, errors } = await fetchWithRetry(
        f.url,
        {
          headers: { 'User-Agent': 'medical-aid-automation/1.0' },
        },
        retry
      );
      if (!response.ok) {
        results.push({
          code: f.code,
          inserted: 0,
          skipped: 0,
          error: `HTTP ${response.status}${errors.length ? ' · ' + errors.join('; ') : ''}`,
          fetch_attempts: attempts,
        });
        continue;
      }
      const text = await response.text();
      const r = await importDdinterFromCsvText(text, f.code);
      total += r.inserted;
      results.push({ code: f.code, ...r, fetch_attempts: attempts });
    } catch (e: unknown) {
      results.push({
        code: f.code,
        inserted: 0,
        skipped: 0,
        error: e instanceof Error ? e.message : 'fetch failed',
        fetch_attempts: retry.maxAttempts,
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

function tokenMatchesSide(tokens: string[], sideNorm: string): boolean {
  return tokens.some(
    (t) =>
      sideNorm === t ||
      sideNorm.startsWith(t + ' ') ||
      sideNorm.startsWith(t) ||
      t.startsWith(sideNorm)
  );
}

/**
 * Check all pairs among a list of drug names against imported DDInter pairs.
 * Uses synonym expansion (Egypt brands → ingredients) + token matching.
 */
export async function checkInteractions(
  drugNames: string[]
): Promise<{
  hits: DdiHit[];
  drugs_checked: string[];
  resolved: Array<{ original: string; ingredient: string | null }>;
  pair_db_count: number;
}> {
  await ensureDdinterTables();

  const countRes = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM ddinter_pairs`
  );
  const pair_db_count = Number(countRes.rows[0]?.n || 0);

  const cleaned = [...new Set(drugNames.map((d) => d.trim()).filter(Boolean))];
  if (cleaned.length < 2 || pair_db_count === 0) {
    return {
      hits: [],
      drugs_checked: cleaned,
      resolved: cleaned.map((d) => ({ original: d, ingredient: null })),
      pair_db_count,
    };
  }

  const drugTokensMap = await Promise.all(
    cleaned.map(async (d) => {
      const exp = await expandDrugTokens(d);
      return {
        original: d,
        tokens: exp.tokens,
        ingredient: exp.resolved_ingredient,
      };
    })
  );

  const allTokens = [...new Set(drugTokensMap.flatMap((d) => d.tokens))];

  const res = await query<{
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
  ).catch(async () =>
    query(
      `SELECT drug_a, drug_b, drug_a_norm, drug_b_norm, level
       FROM ddinter_pairs
       WHERE drug_a_norm = ANY($1::text[]) OR drug_b_norm = ANY($1::text[])`,
      [allTokens]
    )
  );

  const hits: DdiHit[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < drugTokensMap.length; i++) {
    for (let j = i + 1; j < drugTokensMap.length; j++) {
      const A = drugTokensMap[i];
      const B = drugTokensMap[j];
      for (const row of res.rows) {
        const aOnA = tokenMatchesSide(A.tokens, row.drug_a_norm);
        const bOnB = tokenMatchesSide(B.tokens, row.drug_b_norm);
        const aOnB = tokenMatchesSide(A.tokens, row.drug_b_norm);
        const bOnA = tokenMatchesSide(B.tokens, row.drug_a_norm);

        if ((aOnA && bOnB) || (aOnB && bOnA)) {
          const key = `${row.drug_a_norm}|${row.drug_b_norm}|${row.level}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const viaA = A.ingredient
            ? `${A.original}→${A.ingredient}`
            : A.original;
          const viaB = B.ingredient
            ? `${B.original}→${B.ingredient}`
            : B.original;
          hits.push({
            drug_a: row.drug_a,
            drug_b: row.drug_b,
            level: row.level,
            matched_via: `${viaA} × ${viaB}`,
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

  return {
    hits,
    drugs_checked: cleaned,
    resolved: drugTokensMap.map((d) => ({
      original: d.original,
      ingredient: d.ingredient,
    })),
    pair_db_count,
  };
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
