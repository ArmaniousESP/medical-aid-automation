import { CONFIG, FR, AR } from './config';
import {
  MedEntry,
  normalize,
  bestMedMatch,
  parseQuantity,
  cleanDriveLinks,
} from './matching';
import { resolveUnitPriceWithExternal, computePriceTotal } from './pricing';
import { getSheetValues, appendRows, getSpreadsheetIdFromEnv } from './google';
import { withRetry } from './errors';
import { medMatchConfidence } from './confidence';

export interface ProcessResult {
  newRows: number;
  skipped: number;
  lowMatch: number;
  samples: any[];
  rows: any[];
  dryRun: boolean;
  message: string;
  totalEstimatedCost: number | null;
  warnings: string[];
  ocr_filled?: number;
  ocr_skipped_low_confidence?: number;
  invoice_validation_fail?: number;
  enroll?: {
    groups: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null;
}

function makeKey(a: any, b: any, med: string): string {
  return `${String(a || '').trim()}||${String(b || '').trim()}||${normalize(med)}`;
}

function splitAttachmentUrls(raw: string): string[] {
  return String(raw || '')
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 6);
}

/** Minimum band to accept OCR-filled meds. default: auto (strict). */
function ocrFillAllowed(band: string | undefined): boolean {
  const min = (process.env.OCR_FILL_MIN_BAND || 'auto').toLowerCase();
  if (min === 'manual') return true;
  if (min === 'review') return band === 'auto' || band === 'review';
  return band === 'auto';
}

export async function processNewResponses(dryRun = false): Promise<ProcessResult> {
  const warnings: string[] = [];
  const spreadsheetId = await getSpreadsheetIdFromEnv();
  const ocrFill =
    process.env.OCR_FILL_EMPTY_MEDS === '1' ||
    process.env.OCR_FILL_EMPTY_MEDS === 'true';
  let ocr_filled = 0;
  let ocr_skipped_low_confidence = 0;
  let invoice_validation_fail = 0;

  const medRaw = await withRetry(
    () => getSheetValues(spreadsheetId, `${CONFIG.MEDDB_SHEET}!A:C`),
    { retries: 2, label: 'meddb3' }
  );
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

  const approvedRaw = await withRetry(
    () => getSheetValues(spreadsheetId, `${CONFIG.APPROVED_SHEET}!A:H`),
    { retries: 2, label: 'approved-keys' }
  );
  const idKeys = new Set<string>();
  const nameKeys = new Set<string>();

  for (let i = 1; i < approvedRaw.length; i++) {
    const empName = approvedRaw[i][AR.EMP_NAME - 1];
    const empId = approvedRaw[i][AR.ID - 1];
    const patient = approvedRaw[i][AR.PATIENT - 1] || '';
    const med = approvedRaw[i][AR.REQUESTED_MED - 1];
    if (!med) continue;
    if (empId !== undefined && empId !== null && empId !== '') {
      idKeys.add(makeKey(empId, patient, String(med)));
    }
    if (empName) {
      nameKeys.add(makeKey(empName, patient, String(med)));
    }
  }

  const formRaw = await withRetry(
    () => getSheetValues(spreadsheetId, `${CONFIG.FORM_SHEET}!A:AK`),
    { retries: 2, label: 'form-responses' }
  );
  const fromDate = new Date(CONFIG.PROCESS_FROM_DATE);
  const responses: any[] = [];

  for (let i = 1; i < formRaw.length; i++) {
    const row = formRaw[i];
    const tsRaw = row[FR.TIMESTAMP - 1];
    if (!tsRaw) continue;

    const ts = new Date(tsRaw);
    if (isNaN(ts.getTime()) || ts < fromDate) continue;

    const empName = row[FR.EMP_NAME - 1];
    const empId = row[FR.EMP_ID - 1];
    if (!empName && !empId) continue;

    const meds: string[] = [];
    for (let c = FR.MED_START; c <= FR.MED_END; c++) {
      const val = row[c - 1];
      if (val && String(val).trim()) meds.push(String(val).trim());
    }

    responses.push({
      timestamp: ts,
      empId,
      empName: empName ? String(empName).trim() : '',
      company: row[FR.COMPANY - 1] || '',
      phone: row[FR.PHONE - 1] || '',
      patient: row[FR.PATIENT - 1] || '',
      meds,
      comments: row[FR.COMMENTS - 1] || '',
      roshetta: row[FR.ROSHETTA - 1] || '',
      cardPhoto: row[FR.CARD_PHOTO - 1] || '',
      proofRelation: row[FR.PROOF_RELATION - 1] || '',
      labs: [row[FR.LABS_1 - 1], row[FR.LABS_2 - 1]].filter(Boolean).join(', '),
      rejectionEmail: row[FR.REJECTION_EMAIL - 1] || '',
    });
  }

  if (ocrFill) {
    try {
      const { runBatchOcr } = await import('./prescriptionOcr');
      const { ocrResultToFormFields, mergeOcrIntoFormMeds } = await import(
        './ocrToFormFields'
      );
      const { resolveUnitPrice } = await import('./pricing');

      for (const resp of responses) {
        if (resp.meds.length > 0) continue;
        const urls = splitAttachmentUrls(resp.roshetta);
        if (!urls.length) continue;
        try {
          const batch = await runBatchOcr({
            urls,
            medDb,
            docKind: 'auto',
          });

          let formularyEst: number | null = null;
          let sum = 0;
          let any = false;
          for (const r of batch.results) {
            for (const line of r.lines || []) {
              const name = line.matched_name || line.clean_name;
              const unit = resolveUnitPrice(name, medDb);
              if (unit != null) {
                sum += unit * (line.qty > 0 ? line.qty : 1);
                any = true;
              }
            }
          }
          if (any) formularyEst = Math.round(sum * 100) / 100;

          const mapping = ocrResultToFormFields(batch.results, {
            formulary_estimate_egp: formularyEst,
          });

          const band = mapping.confidence_detail?.band;
          if (!ocrFillAllowed(band)) {
            ocr_skipped_low_confidence += 1;
            warnings.push(
              `ocr_low_conf:${resp.empName}:${band || 'unknown'}:${mapping.confidence_detail?.score ?? '?'}`
            );
            resp.ocrReview = {
              band,
              score: mapping.confidence_detail?.score,
              med_fields: mapping.med_fields,
              notes: mapping.notes_fragment,
              urls,
            };
            continue;
          }

          const merged = mergeOcrIntoFormMeds(resp.meds, mapping);
          if (merged.used_ocr && merged.meds.length) {
            resp.meds = merged.meds;
            resp.ocrNotes = mapping.notes_fragment;
            resp.ocrConfidenceBand = band;
            resp.ocrConfidenceScore = mapping.confidence_detail?.score;
            const invOk = mapping.invoice_validation?.ok_for_auto_price === true;
            resp.ocrInvoiceTotal = invOk ? mapping.invoice_total_egp : null;
            resp.ocrInvoiceStatus = mapping.invoice_validation?.status || null;
            if (mapping.invoice_validation && !invOk) {
              invoice_validation_fail += 1;
              warnings.push(
                `invoice_val:${resp.empName}:${mapping.invoice_validation.status}`
              );
            }
            ocr_filled += 1;
          }
        } catch (e: unknown) {
          warnings.push(
            `ocr:${resp.empName}: ${e instanceof Error ? e.message : 'failed'}`
          );
        }
      }
    } catch (e: unknown) {
      warnings.push(
        `ocr_fill_init: ${e instanceof Error ? e.message : 'failed'}`
      );
    }
  }

  const withMeds = responses.filter((r) => r.meds.length > 0);

  const newRows: any[] = [];
  let skipped = 0;
  let lowMatch = 0;
  let totalEstimatedCost = 0;
  let hasAnyPrice = false;

  for (const resp of withMeds) {
    for (const medText of resp.meds) {
      const idKey = makeKey(resp.empId, resp.patient, medText);
      const nameKey = makeKey(resp.empName, resp.patient, medText);

      if (idKeys.has(idKey) || nameKeys.has(nameKey)) {
        skipped++;
        continue;
      }

      const { qty, cleanName } = parseQuantity(medText);
      const match = bestMedMatch(cleanName, medDb);
      const conf = medMatchConfidence({
        matchScore: match.score || 0,
        exactNorm: match.score === 1,
        hasEvaHint: !!match.eva,
      });

      let availability = 'NOT IN EVA';
      let newMed = cleanName;
      let alt = 'NOT EVA';
      let unitPrice: number | null = null;
      let priceSource = 'none';
      const score = match.score || 0;

      if (match.name) {
        const isEva =
          !!match.eva ||
          /EVA|EVAPHARMA|LIMITLESS/i.test(match.name);

        if (isEva && match.eva && normalize(match.eva) !== 'NOT EVA') {
          availability = 'Available in EVA';
          newMed = match.eva;
          alt = match.eva;
        } else if (isEva) {
          availability = 'Available in EVA';
          newMed = match.name;
          alt = match.name;
        } else {
          availability = 'NOT IN EVA';
          newMed = match.name;
          alt = 'NOT EVA';
        }
      }

      const priceLookupNames = [newMed, match.name, cleanName].filter(
        Boolean
      ) as string[];
      for (const name of priceLookupNames) {
        try {
          const resolved = await resolveUnitPriceWithExternal(name, medDb);
          if (resolved.unitPrice !== null) {
            unitPrice = resolved.unitPrice;
            priceSource = resolved.source;
            break;
          }
        } catch (e) {
          warnings.push(
            `price:${name}: ${e instanceof Error ? e.message : 'failed'}`
          );
        }
      }

      const isLow = score < CONFIG.LOW_MATCH_THRESHOLD;
      if (isLow) lowMatch++;

      const notesParts: string[] = [];
      if (isLow) {
        notesParts.push(
          `LOW MATCH (${score.toFixed(2)}) - review needed | original: ${medText}`
        );
      }
      notesParts.push(conf.summary);
      if (priceSource !== 'none' && priceSource !== 'meddb3') {
        notesParts.push(`price source: ${priceSource}`);
      }
      if (resp.ocrNotes) notesParts.push(String(resp.ocrNotes));
      if (resp.ocrInvoiceStatus) {
        notesParts.push(`invoice validation: ${resp.ocrInvoiceStatus}`);
      }
      if (resp.roshetta) notesParts.push(`روشتة: ${cleanDriveLinks(resp.roshetta)}`);
      if (resp.labs) notesParts.push(`فحوصات: ${cleanDriveLinks(resp.labs)}`);
      if (resp.cardPhoto)
        notesParts.push(`كارنيه: ${cleanDriveLinks(resp.cardPhoto)}`);
      if (resp.proofRelation)
        notesParts.push(`إثبات قرابة: ${cleanDriveLinks(resp.proofRelation)}`);
      if (resp.rejectionEmail)
        notesParts.push(`رفض ليمتليس: ${cleanDriveLinks(resp.rejectionEmail)}`);
      if (resp.comments)
        notesParts.push(`تعليق: ${String(resp.comments).substring(0, 120)}`);

      let priceTotal = computePriceTotal(unitPrice, qty);
      if (
        resp.ocrInvoiceTotal != null &&
        resp.meds.length === 1 &&
        (priceTotal === null || priceTotal === '')
      ) {
        priceTotal = resp.ocrInvoiceTotal;
        notesParts.push('price from OCR invoice total (validated)');
        priceSource = 'ocr_invoice';
      }

      const notes = notesParts.join(' | ');

      if (typeof priceTotal === 'number') {
        totalEstimatedCost += priceTotal;
        hasAnyPrice = true;
      }

      const lastUpdate = resp.timestamp
        ? `${String(resp.timestamp.getMonth() + 1).padStart(2, '0')}/${String(
            resp.timestamp.getDate()
          ).padStart(2, '0')}/${resp.timestamp.getFullYear()}`
        : '';

      newRows.push({
        company: resp.company,
        empName: resp.empName,
        id: resp.empId,
        phone: resp.phone,
        lastUpdate,
        patient: resp.patient,
        requestedMed: cleanName,
        originalMed: medText,
        qty,
        unitPrice,
        priceTotal,
        priceSource,
        companyDrug: availability,
        alt1: alt,
        alt2: alt,
        newMed,
        qty2: qty,
        notes,
        matchScore: score,
        isLowMatch: isLow,
        confidenceBand: conf.band,
        confidenceScore: conf.score,
        roshetta: cleanDriveLinks(resp.roshetta),
        labs: cleanDriveLinks(resp.labs),
        cardPhoto: cleanDriveLinks(resp.cardPhoto),
        proofRelation: cleanDriveLinks(resp.proofRelation),
        fromOcr: !!resp.ocrNotes,
      });

      idKeys.add(idKey);
      nameKeys.add(nameKey);
    }
  }

  const samples = newRows.slice(0, 12).map((r) => ({
    employee: r.empName,
    patient: r.patient,
    requested: r.requestedMed,
    original: r.originalMed,
    newMed: r.newMed,
    availability: r.companyDrug,
    qty: r.qty,
    unitPrice: r.unitPrice,
    priceTotal: r.priceTotal,
    priceSource: r.priceSource,
    score: r.matchScore,
    isLowMatch: r.isLowMatch,
    confidenceBand: r.confidenceBand,
    confidenceScore: r.confidenceScore,
    roshetta: r.roshetta,
    labs: r.labs,
    notes: r.notes,
    fromOcr: r.fromOcr,
  }));

  if (!dryRun && newRows.length > 0) {
    const values = newRows.map((r) => {
      const row = new Array(21).fill('');
      row[AR.COMPANY - 1] = r.company;
      row[AR.EMP_NAME - 1] = r.empName;
      row[AR.ID - 1] = r.id;
      row[AR.PHONE - 1] = r.phone;
      row[AR.LAST_UPDATE - 1] = r.lastUpdate;
      row[AR.PATIENT - 1] = r.patient;
      row[AR.REQUESTED_MED - 1] = r.requestedMed;
      row[AR.QTY - 1] = r.qty;
      row[AR.PRICE_TOTAL - 1] = r.priceTotal;
      row[AR.COMPANY_DRUG - 1] = r.companyDrug;
      row[AR.ALT1 - 1] = r.alt1;
      row[AR.ALT2 - 1] = r.alt2;
      row[AR.NEW_MED - 1] = r.newMed;
      row[AR.QTY2 - 1] = r.qty2;
      row[AR.NOTES - 1] = r.notes;
      return row;
    });

    await withRetry(
      () => appendRows(spreadsheetId, `${CONFIG.APPROVED_SHEET}!A:U`, values),
      { retries: 2, label: 'append-approved' }
    );
  }

  let enroll: ProcessResult['enroll'] = null;
  const autoEnroll = process.env.AUTO_ENROLL_CHRONIC !== 'false';
  if (!dryRun && autoEnroll && process.env.DATABASE_URL) {
    try {
      const { syncApprovedToPrograms } = await import('./syncApprovedToPrograms');
      const sync = await syncApprovedToPrograms();
      enroll = {
        groups: sync.groups,
        created: sync.created,
        updated: sync.updated,
        skipped: sync.skipped,
        errors: sync.errors,
      };
      if (sync.errors?.length) {
        warnings.push(...sync.errors.slice(0, 20).map((e) => `enroll:${e}`));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'enroll failed';
      enroll = {
        groups: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [msg],
      };
      warnings.push(`enroll_soft_fail:${msg}`);
    }
  }

  const costStr = hasAnyPrice
    ? ` | Est. total cost: ${Math.round(totalEstimatedCost)} EGP`
    : '';
  const enrollStr = enroll
    ? ` | Chronic enroll: +${enroll.created} / ~${enroll.updated} / skip ${enroll.skipped}`
    : '';
  const ocrStr = ocr_filled ? ` | OCR-filled: ${ocr_filled}` : '';
  const ocrSkipStr = ocr_skipped_low_confidence
    ? ` | OCR skipped (low conf): ${ocr_skipped_low_confidence}`
    : '';
  const invStr = invoice_validation_fail
    ? ` | Invoice validation not-pass: ${invoice_validation_fail}`
    : '';

  const message =
    [
      `New rows: ${newRows.length}`,
      `Skipped (already existed): ${skipped}`,
      `Low-confidence matches: ${lowMatch}`,
      dryRun ? '[DRY RUN – nothing written]' : 'Rows appended to Approved-Requests.',
    ].join(' | ') +
    costStr +
    enrollStr +
    ocrStr +
    ocrSkipStr +
    invStr;

  return {
    newRows: newRows.length,
    skipped,
    lowMatch,
    samples,
    rows: samples,
    dryRun,
    message,
    totalEstimatedCost: hasAnyPrice
      ? Math.round(totalEstimatedCost * 100) / 100
      : null,
    warnings: warnings.slice(0, 50),
    ocr_filled,
    ocr_skipped_low_confidence,
    invoice_validation_fail,
    enroll,
  };
}
