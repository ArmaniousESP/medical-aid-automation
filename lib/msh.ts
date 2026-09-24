/**
 * Medicine Support Hub (MSH) client for the ops platform.
 * Catalog search + cost estimate via public/partner HTTP if configured.
 *
 * Env (optional):
 *   MSH_API_BASE   default https://medicinesupport.app
 *   MSH_API_KEY    if partner API requires auth
 *
 * MCP connector (in chat) uses Appwrite session; server uses HTTP when available.
 */

export type MshMedicine = {
  id?: string;
  canonical_id?: string | number;
  name_en?: string;
  name_ar?: string;
  scientific_name?: string;
  manufacturer?: string;
  price_egp?: number | null;
  raw?: unknown;
};

export function mshConfigured(): boolean {
  return true; // catalog search may work without key; key unlocks partner routes
}

function baseUrl(): string {
  return (
    process.env.MSH_API_BASE ||
    process.env.NEXT_PUBLIC_MSH_URL ||
    'https://medicinesupport.app'
  ).replace(/\/$/, '');
}

async function mshFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (process.env.MSH_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MSH_API_KEY}`;
  }
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(12_000),
  });
}

/**
 * Search medicines. Tries MSH API paths; falls back to empty on failure
 * so intake still works with free-text meds.
 */
export async function mshSearchMedicines(
  q: string,
  limit = 8
): Promise<{ ok: boolean; items: MshMedicine[]; error?: string }> {
  if (!q?.trim()) return { ok: true, items: [] };
  const query = encodeURIComponent(q.trim());
  const paths = [
    `/api/medicines/search?q=${query}&limit=${limit}`,
    `/api/catalog/search?q=${query}&limit=${limit}`,
    `/api/v1/medicines?search=${query}&limit=${limit}`,
  ];
  for (const path of paths) {
    try {
      const res = await mshFetch(path);
      if (!res.ok) continue;
      const data = await res.json();
      const rows = Array.isArray(data)
        ? data
        : data.items || data.results || data.medicines || data.data || [];
      const items: MshMedicine[] = (rows as any[]).slice(0, limit).map((r) => ({
        id: r.id || r.$id || r.document_id,
        canonical_id: r.canonical_id ?? r.canonicalId,
        name_en: r.name_en || r.nameEn || r.brand || r.name,
        name_ar: r.name_ar || r.nameAr || r.name_arabic,
        scientific_name: r.scientific_name || r.scientificName || r.inn,
        manufacturer: r.manufacturer || r.company,
        price_egp:
          r.price_egp ?? r.priceEgp ?? r.price ?? r.public_price ?? null,
        raw: r,
      }));
      return { ok: true, items };
    } catch {
      /* try next path */
    }
  }
  return {
    ok: false,
    items: [],
    error: 'MSH catalog unreachable — use free-text medicine names',
  };
}

export async function mshEstimateCost(
  lines: { query: string; quantity?: number; canonical_id?: string | number }[]
): Promise<{
  ok: boolean;
  total_egp?: number | null;
  lines?: unknown[];
  disclaimer?: string;
  error?: string;
}> {
  try {
    const res = await mshFetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        total_egp: data.total_egp ?? data.total ?? null,
        lines: data.lines,
        disclaimer: data.disclaimer,
      };
    }
  } catch {
    /* local fallback */
  }

  // Local: sum search first-hit prices
  let total = 0;
  let any = false;
  const out: unknown[] = [];
  for (const line of lines) {
    const { items } = await mshSearchMedicines(line.query, 1);
    const hit = items[0];
    const qty = line.quantity && line.quantity > 0 ? line.quantity : 1;
    const unit = hit?.price_egp != null ? Number(hit.price_egp) : null;
    if (unit != null) {
      total += unit * qty;
      any = true;
    }
    out.push({
      query: line.query,
      matched: hit?.name_en || hit?.name_ar,
      unit_price_egp: unit,
      quantity: qty,
      line_total: unit != null ? unit * qty : null,
    });
  }
  return {
    ok: any,
    total_egp: any ? Math.round(total * 100) / 100 : null,
    lines: out,
    disclaimer:
      'Indicative catalog estimate only — not a claim adjudication or final aid amount.',
  };
}
