/**
 * External price providers for Egyptian medicines.
 *
 * Priority when resolving a unit price:
 *  1. MEDDB3 (handled in processor)
 *  2. DwaPrices sample API (live)
 *  3. Open Egyptian Drug Database (GitHub, cached)
 */

import { normalize } from './matching';

export type ExternalPriceHit = {
  name: string;
  price: number;
  source: 'dwaprices' | 'egyptian-drug-db';
  company?: string;
  arabic?: string;
};

// ---------------------------------------------------------------------------
// 1. DwaPrices sample API
// ---------------------------------------------------------------------------

const DWAPRICES_URL =
  process.env.DWAPRICES_API_URL || 'https://dwaprices.com/sample-api.php';

export async function searchDwaPrices(
  query: string,
  limit = 5
): Promise<ExternalPriceHit[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${DWAPRICES_URL}?search=${encodeURIComponent(query.trim())}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // short timeout via AbortSignal if available
      signal: AbortSignal.timeout?.(8000),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

    const hits: ExternalPriceHit[] = [];
    for (const row of rows) {
      const price = parseFloat(String(row.price ?? '').replace(',', '.'));
      if (isNaN(price) || price <= 0) continue;
      hits.push({
        name: String(row.name || '').trim(),
        price,
        source: 'dwaprices',
        company: row.company ? String(row.company) : undefined,
        arabic: row.arabic ? String(row.arabic) : undefined,
      });
    }
    return hits;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 2. Open Egyptian Drug Database (GitHub, in-memory cache)
// ---------------------------------------------------------------------------

const EDD_JSON_URL =
  process.env.EGYPTIAN_DRUG_DB_URL ||
  'https://raw.githubusercontent.com/karem505/egyptian-drug-database/main/data/egyptian-drugs.json';

type EddRow = {
  commercial_name_en?: string;
  commercial_name_ar?: string;
  scientific_name?: string;
  manufacturer?: string;
  price_egp?: number | null;
};

let eddCache: EddRow[] | null = null;
let eddLoading: Promise<EddRow[]> | null = null;

async function loadEgyptianDrugDb(): Promise<EddRow[]> {
  if (eddCache) return eddCache;
  if (eddLoading) return eddLoading;

  eddLoading = (async () => {
    try {
      const res = await fetch(EDD_JSON_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout?.(20000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      eddCache = Array.isArray(data) ? data : [];
      return eddCache;
    } catch {
      return [];
    } finally {
      eddLoading = null;
    }
  })();

  return eddLoading;
}

export async function searchEgyptianDrugDb(
  query: string,
  limit = 5
): Promise<ExternalPriceHit[]> {
  if (!query || query.trim().length < 2) return [];

  const q = normalize(query);
  if (!q) return [];

  const db = await loadEgyptianDrugDb();
  if (!db.length) return [];

  const scored: { hit: ExternalPriceHit; score: number }[] = [];

  for (const row of db) {
    const price = row.price_egp;
    if (price === null || price === undefined || isNaN(Number(price)) || Number(price) <= 0)
      continue;

    const en = normalize(row.commercial_name_en || '');
    const ar = normalize(row.commercial_name_ar || '');
    const sci = normalize(row.scientific_name || '');

    let score = 0;
    if (en === q || ar === q) score = 1;
    else if (en.includes(q) || q.includes(en)) score = 0.85;
    else if (ar.includes(q) || q.includes(ar)) score = 0.8;
    else if (sci.includes(q)) score = 0.55;
    else continue;

    scored.push({
      score,
      hit: {
        name: String(row.commercial_name_en || row.commercial_name_ar || '').trim(),
        price: Number(price),
        source: 'egyptian-drug-db',
        company: row.manufacturer ? String(row.manufacturer) : undefined,
        arabic: row.commercial_name_ar ? String(row.commercial_name_ar) : undefined,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.hit);
}

// ---------------------------------------------------------------------------
// Combined resolver
// ---------------------------------------------------------------------------

/**
 * Look up the best external unit price for a medication name.
 * Tries DwaPrices first (live), then the open Egyptian drug database.
 */
export async function resolveExternalUnitPrice(
  medName: string
): Promise<ExternalPriceHit | null> {
  if (!medName || medName.trim().length < 2) return null;

  // 1. DwaPrices
  const dwa = await searchDwaPrices(medName, 5);
  if (dwa.length > 0) {
    // Prefer closest name match
    const q = normalize(medName);
    dwa.sort((a, b) => {
      const sa = normalize(a.name).includes(q) || q.includes(normalize(a.name)) ? 1 : 0;
      const sb = normalize(b.name).includes(q) || q.includes(normalize(b.name)) ? 1 : 0;
      return sb - sa;
    });
    return dwa[0];
  }

  // 2. Open dataset
  const edd = await searchEgyptianDrugDb(medName, 3);
  if (edd.length > 0) return edd[0];

  return null;
}
