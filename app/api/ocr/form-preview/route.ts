import { NextRequest, NextResponse } from 'next/server';
import { CONFIG, FR } from '@/lib/config';
import { getSheetValues, getSpreadsheetIdFromEnv } from '@/lib/google';
import { loadMedDb } from '@/lib/meddb';
import { runBatchOcr } from '@/lib/prescriptionOcr';
import { ocrResultToFormFields } from '@/lib/ocrToFormFields';
import { resolveUnitPrice } from '@/lib/pricing';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';
import { withRetry } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function splitUrls(raw: string): string[] {
  return String(raw || '')
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 6);
}

/**
 * POST /api/ocr/form-preview
 * Dry-run OCR on recent form rows that have roshetta links.
 * Body: { limit?: number, emptyMedsOnly?: boolean }
 * Does not write sheets.
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 5, 15);
    const emptyMedsOnly = body.emptyMedsOnly !== false;

    const spreadsheetId = await getSpreadsheetIdFromEnv();
    const formRaw = await withRetry(
      () => getSheetValues(spreadsheetId, `${CONFIG.FORM_SHEET}!A:AK`),
      { retries: 2, label: 'form-preview' }
    );

    let medDb;
    try {
      medDb = await loadMedDb();
    } catch {
      medDb = undefined;
    }

    const candidates: Array<{
      rowIndex: number;
      empName: string;
      patient: string;
      meds: string[];
      urls: string[];
    }> = [];

    for (let i = formRaw.length - 1; i >= 1 && candidates.length < limit; i--) {
      const row = formRaw[i];
      const empName = row[FR.EMP_NAME - 1]
        ? String(row[FR.EMP_NAME - 1]).trim()
        : '';
      const patient = row[FR.PATIENT - 1]
        ? String(row[FR.PATIENT - 1]).trim()
        : '';
      const roshetta = row[FR.ROSHETTA - 1] || '';
      const urls = splitUrls(String(roshetta));
      if (!urls.length) continue;

      const meds: string[] = [];
      for (let c = FR.MED_START; c <= FR.MED_END; c++) {
        const val = row[c - 1];
        if (val && String(val).trim()) meds.push(String(val).trim());
      }
      if (emptyMedsOnly && meds.length > 0) continue;

      candidates.push({
        rowIndex: i + 1,
        empName,
        patient,
        meds,
        urls,
      });
    }

    const previews = [];
    for (const c of candidates) {
      try {
        const batch = await runBatchOcr({
          urls: c.urls,
          medDb,
          docKind: 'auto',
        });
        let formularyEst: number | null = null;
        let sum = 0;
        let any = false;
        for (const r of batch.results) {
          for (const line of r.lines || []) {
            if (!medDb) continue;
            const name = line.matched_name || line.clean_name;
            const unit = resolveUnitPrice(name, medDb);
            if (unit != null) {
              sum += unit * (line.qty > 0 ? line.qty : 1);
              any = true;
            }
          }
        }
        if (any) formularyEst = Math.round(sum * 100) / 100;

        const form_fields = ocrResultToFormFields(batch.results, {
          formulary_estimate_egp: formularyEst,
        });

        previews.push({
          rowIndex: c.rowIndex,
          empName: c.empName,
          patient: c.patient,
          existing_meds: c.meds,
          urls: c.urls,
          ocr_ok: batch.ok_count,
          form_fields,
        });
      } catch (e: unknown) {
        previews.push({
          rowIndex: c.rowIndex,
          empName: c.empName,
          patient: c.patient,
          existing_meds: c.meds,
          urls: c.urls,
          error: e instanceof Error ? e.message : 'OCR failed',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: previews.length,
      emptyMedsOnly,
      previews,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
