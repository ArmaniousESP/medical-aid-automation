/**
 * Process pending platform intake (aid_requests) into matching + optional enroll.
 * Does not require Google Sheets.
 */

import { listPendingIntake, updateAidRequestStatus } from '@/lib/intake';
import { normalize, bestMedMatch, parseQuantity, type MedEntry } from '@/lib/matching';
import { resolveUnitPriceWithExternal, computePriceTotal } from '@/lib/pricing';
import { medMatchConfidence } from '@/lib/confidence';
import { query } from '@/lib/db';

async function loadMedDbFromNeon(): Promise<MedEntry[]> {
  try {
    const res = await query<{ name: string; price: string | null; eva: string | null }>(
      `SELECT name, price::text, eva FROM formulary_meds LIMIT 5000`
    ).catch(() => ({ rows: [] as { name: string; price: string | null; eva: string | null }[] }));
    if (res.rows.length) {
      return res.rows.map((r) => ({
        name: r.name,
        price: r.price,
        eva: r.eva,
        norm: normalize(r.name),
      }));
    }
  } catch {
    /* empty */
  }
  return [];
}

export async function processPlatformIntake(dryRun = false) {
  const pending = await listPendingIntake(100);
  const medDb = await loadMedDbFromNeon();
  const details: unknown[] = [];
  let processed = 0;
  let lowMatch = 0;

  for (const req of pending) {
    const meds = (req.meds as { name: string; qty?: number }[]) || [];
    const lineResults: unknown[] = [];

    for (const m of meds) {
      const text = m.name || '';
      const { qty, cleanName } = parseQuantity(text);
      const q = m.qty && m.qty > 0 ? m.qty : qty;
      const match = medDb.length ? bestMedMatch(cleanName, medDb) : { name: null, score: 0, eva: null };
      const conf = medMatchConfidence({
        matchScore: match.score || 0,
        exactNorm: match.score === 1,
        hasEvaHint: !!match.eva,
      });
      if ((match.score || 0) < 0.72) lowMatch++;

      let unitPrice: number | null = null;
      let priceSource = 'none';
      if (medDb.length) {
        try {
          const resolved = await resolveUnitPriceWithExternal(
            match.name || cleanName,
            medDb
          );
          unitPrice = resolved.unitPrice;
          priceSource = resolved.source;
        } catch {
          /* ignore */
        }
      }

      lineResults.push({
        requested: cleanName,
        qty: q,
        matched: match.name,
        score: match.score,
        confidenceBand: conf.band,
        unitPrice,
        priceTotal: computePriceTotal(unitPrice, q),
        priceSource,
        eva: match.eva,
      });
    }

    if (!dryRun) {
      await updateAidRequestStatus(req.id, 'triage', {
        match_notes: JSON.stringify(lineResults).slice(0, 4000),
      });
    }

    processed++;
    details.push({
      id: req.id,
      emp_name: req.emp_name,
      patient_name: req.patient_name,
      lines: lineResults,
    });
  }

  return {
    ok: true,
    dryRun,
    pending: pending.length,
    processed,
    lowMatch,
    details: details.slice(0, 20),
    message: dryRun
      ? `[DRY RUN] Would triage ${processed} platform intake request(s)`
      : `Triaged ${processed} platform intake request(s) (status → triage)`,
  };
}
