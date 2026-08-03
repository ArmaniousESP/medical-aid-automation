import { CONFIG, FR, AR } from './config';
import {
  MedEntry,
  normalize,
  bestMedMatch,
  parseQuantity,
  cleanDriveLinks,
} from './matching';
import { getSheetValues, appendRows, getSpreadsheetIdFromEnv } from './google';

export interface ProcessResult {
  newRows: number;
  skipped: number;
  lowMatch: number;
  samples: any[];
  rows: any[];
  dryRun: boolean;
  message: string;
}

function makeKey(a: any, b: any, med: string): string {
  return `${String(a || '').trim()}||${String(b || '').trim()}||${normalize(med)}`;
}

export async function processNewResponses(dryRun = false): Promise<ProcessResult> {
  const spreadsheetId = await getSpreadsheetIdFromEnv();

  // 1. Load MEDDB3
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

  // 2. Existing keys from Approved-Requests
  const approvedRaw = await getSheetValues(
    spreadsheetId,
    `${CONFIG.APPROVED_SHEET}!A:H`
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

  // 3. New form responses
  const formRaw = await getSheetValues(spreadsheetId, `${CONFIG.FORM_SHEET}!A:AK`);
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
    if (meds.length === 0) continue;

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

  // 4. Expand + match
  const newRows: any[] = [];
  let skipped = 0;
  let lowMatch = 0;

  for (const resp of responses) {
    for (const medText of resp.meds) {
      const idKey = makeKey(resp.empId, resp.patient, medText);
      const nameKey = makeKey(resp.empName, resp.patient, medText);

      if (idKeys.has(idKey) || nameKeys.has(nameKey)) {
        skipped++;
        continue;
      }

      const { qty, cleanName } = parseQuantity(medText);
      const match = bestMedMatch(cleanName, medDb);

      let availability = 'NOT IN EVA';
      let newMed = cleanName;
      let alt = 'NOT EVA';
      let price: any = null;
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
        price = match.price;
      }

      const isLow = score < CONFIG.LOW_MATCH_THRESHOLD;
      if (isLow) lowMatch++;

      const notesParts: string[] = [];
      if (isLow) {
        notesParts.push(
          `LOW MATCH (${score.toFixed(2)}) - review needed | original: ${medText}`
        );
      }
      if (resp.roshetta) notesParts.push(`روشتة: ${cleanDriveLinks(resp.roshetta)}`);
      if (resp.labs) notesParts.push(`فحوصات: ${cleanDriveLinks(resp.labs)}`);
      if (resp.cardPhoto) notesParts.push(`كارنيه: ${cleanDriveLinks(resp.cardPhoto)}`);
      if (resp.proofRelation)
        notesParts.push(`إثبات قرابة: ${cleanDriveLinks(resp.proofRelation)}`);
      if (resp.rejectionEmail)
        notesParts.push(`رفض ليمتليس: ${cleanDriveLinks(resp.rejectionEmail)}`);
      if (resp.comments)
        notesParts.push(`تعليق: ${String(resp.comments).substring(0, 120)}`);

      const notes = notesParts.join(' | ');

      let priceTotal: number | string = '';
      if (price !== null && price !== '' && !isNaN(Number(price))) {
        priceTotal = Number(price) * Number(qty);
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
        priceTotal,
        companyDrug: availability,
        alt1: alt,
        alt2: alt,
        newMed,
        qty2: qty,
        notes,
        matchScore: score,
        isLowMatch: isLow,
        roshetta: cleanDriveLinks(resp.roshetta),
        labs: cleanDriveLinks(resp.labs),
        cardPhoto: cleanDriveLinks(resp.cardPhoto),
        proofRelation: cleanDriveLinks(resp.proofRelation),
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
    score: r.matchScore,
    isLowMatch: r.isLowMatch,
    roshetta: r.roshetta,
    labs: r.labs,
    notes: r.notes,
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

    await appendRows(spreadsheetId, `${CONFIG.APPROVED_SHEET}!A:U`, values);
  }

  const message = [
    `New rows: ${newRows.length}`,
    `Skipped (already existed): ${skipped}`,
    `Low-confidence matches: ${lowMatch}`,
    dryRun ? '[DRY RUN – nothing written]' : 'Rows appended to Approved-Requests.',
  ].join(' | ');

  return {
    newRows: newRows.length,
    skipped,
    lowMatch,
    samples,
    rows: samples, // alias for UI
    dryRun,
    message,
  };
}
