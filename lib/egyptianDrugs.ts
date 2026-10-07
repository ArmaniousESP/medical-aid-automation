/**
 * Egyptian drug catalog from:
 * https://github.com/karem505/egyptian-drug-database (CC0)
 * ~25k medicines: EN/AR trade names, scientific name, manufacturer, class, route, EGP price.
 */

export type EgDrug = {
  commercial_name_en: string;
  commercial_name_ar: string;
  scientific_name: string;
  manufacturer: string;
  drug_class: string;
  route: string;
  price_egp: number | null;
};

const CSV_URL =
  process.env.EGYPTIAN_DRUGS_CSV_URL ||
  'https://raw.githubusercontent.com/karem505/egyptian-drug-database/main/data/egyptian-drugs.csv';

let cache: EgDrug[] | null = null;
let loading: Promise<EgDrug[]> | null = null;
let loadedAt = 0;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6h

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): EgDrug[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iEn = idx('commercial_name_en');
  const iAr = idx('commercial_name_ar');
  const iSci = idx('scientific_name');
  const iMfr = idx('manufacturer');
  const iClass = idx('drug_class');
  const iRoute = idx('route');
  const iPrice = idx('price_egp');

  const drugs: EgDrug[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    const en = (cols[iEn] || '').trim();
    if (!en) continue;
    const priceRaw = (cols[iPrice] || '').trim();
    const price = priceRaw ? Number(priceRaw) : null;
    drugs.push({
      commercial_name_en: en,
      commercial_name_ar: (cols[iAr] || '').trim(),
      scientific_name: (cols[iSci] || '').trim(),
      manufacturer: (cols[iMfr] || '').trim(),
      drug_class: (cols[iClass] || '').trim(),
      route: (cols[iRoute] || '').trim(),
      price_egp: price != null && !Number.isNaN(price) ? price : null,
    });
  }
  return drugs;
}

export async function loadEgyptianDrugs(force = false): Promise<EgDrug[]> {
  if (!force && cache && Date.now() - loadedAt < CACHE_MS) return cache;
  if (!force && loading) return loading;

  loading = (async () => {
    const res = await fetch(CSV_URL, {
      headers: { Accept: 'text/csv,*/*' },
      signal: AbortSignal.timeout(60_000),
      next: { revalidate: 21600 },
    } as RequestInit);
    if (!res.ok) {
      throw new Error(`Egyptian drugs CSV HTTP ${res.status}`);
    }
    const text = await res.text();
    const drugs = parseCsv(text);
    cache = drugs;
    loadedAt = Date.now();
    loading = null;
    return drugs;
  })().catch((e) => {
    loading = null;
    throw e;
  });

  return loading;
}

function scoreDrug(d: EgDrug, q: string): number {
  const nq = q.toLowerCase().trim();
  if (!nq) return 0;
  const en = d.commercial_name_en.toLowerCase();
  const ar = d.commercial_name_ar.toLowerCase();
  const sci = d.scientific_name.toLowerCase();
  if (en === nq || ar === nq) return 1000;
  if (en.startsWith(nq)) return 800 + Math.min(nq.length, 50);
  if (ar.startsWith(nq)) return 750;
  if (en.includes(nq)) return 500 + Math.min(nq.length, 40);
  if (ar.includes(nq)) return 450;
  if (sci.includes(nq)) return 300;
  // token match (e.g. "concor 5")
  const tokens = nq.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => en.includes(t) || ar.includes(t) || sci.includes(t))) {
    return 600;
  }
  return 0;
}

export type EgSearchItem = {
  name_en: string;
  name_ar?: string;
  scientific_name?: string;
  manufacturer?: string;
  drug_class?: string;
  route?: string;
  price_egp?: number | null;
  source: 'egyptian-drug-database';
};

/** Ranked search over Egyptian market catalog. */
export async function searchEgyptianDrugs(
  q: string,
  limit = 8
): Promise<{ ok: boolean; items: EgSearchItem[]; error?: string; total?: number }> {
  if (!q?.trim()) return { ok: true, items: [], total: 0 };
  try {
    const drugs = await loadEgyptianDrugs();
    const scored = drugs
      .map((d) => ({ d, s: scoreDrug(d, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || (a.d.price_egp ?? 9e9) - (b.d.price_egp ?? 9e9))
      .slice(0, Math.min(limit, 40));

    return {
      ok: true,
      total: drugs.length,
      items: scored.map(({ d }) => ({
        name_en: d.commercial_name_en,
        name_ar: d.commercial_name_ar || undefined,
        scientific_name: d.scientific_name || undefined,
        manufacturer: d.manufacturer || undefined,
        drug_class: d.drug_class || undefined,
        route: d.route || undefined,
        price_egp: d.price_egp,
        source: 'egyptian-drug-database' as const,
      })),
    };
  } catch (e: unknown) {
    return {
      ok: false,
      items: [],
      error: e instanceof Error ? e.message : 'Egyptian catalog load failed',
    };
  }
}

/** Best single match for cost estimate. */
export async function matchEgyptianDrug(query: string): Promise<EgSearchItem | null> {
  const { items } = await searchEgyptianDrugs(query, 1);
  return items[0] || null;
}

export async function estimateEgyptianCost(
  lines: { query: string; quantity?: number }[]
): Promise<{
  ok: boolean;
  total_egp: number | null;
  lines: {
    query: string;
    matched?: string;
    scientific_name?: string;
    unit_price_egp: number | null;
    quantity: number;
    line_total: number | null;
  }[];
  disclaimer: string;
  catalog_size?: number;
}> {
  const out: {
    query: string;
    matched?: string;
    scientific_name?: string;
    unit_price_egp: number | null;
    quantity: number;
    line_total: number | null;
  }[] = [];
  let total = 0;
  let any = false;
  let catalog_size: number | undefined;

  for (const line of lines) {
    const qty = line.quantity && line.quantity > 0 ? line.quantity : 1;
    const hit = await matchEgyptianDrug(line.query);
    if (hit && catalog_size == null) {
      const all = await loadEgyptianDrugs().catch(() => null);
      catalog_size = all?.length;
    }
    const unit = hit?.price_egp != null ? Number(hit.price_egp) : null;
    if (unit != null) {
      total += unit * qty;
      any = true;
    }
    out.push({
      query: line.query,
      matched: hit?.name_en,
      scientific_name: hit?.scientific_name,
      unit_price_egp: unit,
      quantity: qty,
      line_total: unit != null ? Math.round(unit * qty * 100) / 100 : null,
    });
  }

  return {
    ok: any,
    total_egp: any ? Math.round(total * 100) / 100 : null,
    lines: out,
    catalog_size,
    disclaimer:
      'Indicative EGP prices from the open Egyptian drug database (karem505/egyptian-drug-database, CC0). Not a claim decision.',
  };
}
