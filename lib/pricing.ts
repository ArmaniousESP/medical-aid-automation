import { MedEntry, normalize } from './matching';

/**
 * Resolve the best available unit price for a medication name
 * by looking it up in MEDDB3 (exact / fuzzy).
 */
export function resolveUnitPrice(
  medName: string | null | undefined,
  medDb: MedEntry[]
): number | null {
  if (!medName) return null;
  const norm = normalize(medName);
  if (!norm) return null;

  // 1. Exact norm match with a numeric price
  for (const m of medDb) {
    if (m.norm === norm && m.price !== null && m.price !== '' && !isNaN(Number(m.price))) {
      return Number(m.price);
    }
  }

  // 2. Contains match with a numeric price (prefer shorter / closer names)
  let best: { price: number; len: number } | null = null;
  for (const m of medDb) {
    if (
      m.price !== null &&
      m.price !== '' &&
      !isNaN(Number(m.price)) &&
      (m.norm.includes(norm) || norm.includes(m.norm))
    ) {
      const len = Math.abs(m.norm.length - norm.length);
      if (!best || len < best.len) {
        best = { price: Number(m.price), len };
      }
    }
  }
  return best ? best.price : null;
}

/**
 * Compute Price_Total = unitPrice × qty (or empty if unknown).
 */
export function computePriceTotal(
  unitPrice: number | null,
  qty: number
): number | string {
  if (unitPrice === null || isNaN(unitPrice) || isNaN(qty)) return '';
  return Math.round(unitPrice * qty * 100) / 100;
}
