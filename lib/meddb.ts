import { CONFIG } from '@/lib/config';
import { MedEntry, normalize } from '@/lib/matching';
import { getSheetValues, getSpreadsheetIdFromEnv } from '@/lib/google';

let cache: { at: number; data: MedEntry[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

/**
 * Load MEDDB3 from the Google Sheet (cached ~10 min per serverless instance).
 * Returns [] if Google env is missing so refill generation still works.
 */
export async function loadMedDb(): Promise<MedEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const spreadsheetId = await getSpreadsheetIdFromEnv();
    const medRaw = await getSheetValues(spreadsheetId, `${CONFIG.MEDDB_SHEET}!A:C`);
    const medDb: MedEntry[] = [];
    for (let i = 1; i < medRaw.length; i++) {
      const name = medRaw[i][0];
      if (!name) continue;
      medDb.push({
        name: String(name).trim(),
        price: medRaw[i][1] ?? null,
        eva: medRaw[i][2] ? String(medRaw[i][2]).trim() : null,
        norm: normalize(name),
      });
    }
    cache = { at: Date.now(), data: medDb };
    return medDb;
  } catch {
    return [];
  }
}
