/**
 * Map OCR output → form med fields + invoice validation + confidence.
 */

import { CONFIG } from '@/lib/config';
import type { OcrResult, ParsedMedLine } from '@/lib/prescriptionOcr';
import {
  type InvoiceParseResult,
  validateInvoiceTotal,
  type InvoiceValidation,
} from '@/lib/invoiceOcr';
import {
  ocrMedsConfidence,
  invoiceConfidence,
  requestConfidence,
  type ConfidenceResult,
} from '@/lib/confidence';

export type FormMedSlot = {
  slot: number;
  form_value: string;
  raw_ocr: string;
  clean_name: string;
  qty: number;
  frequency_hint: string | null;
  matched_name: string | null;
  match_score: number;
  formulary_hint: string | null;
};

export type FormFieldMapping = {
  med_fields: string[];
  med_slots: FormMedSlot[];
  notes_fragment: string;
  invoice_total_egp: number | null;
  pharmacy_hint: string | null;
  roshetta_urls: string[];
  invoice_urls: string[];
  /** Legacy coarse label */
  confidence: 'high' | 'medium' | 'low';
  needs_review: boolean;
  invoice_validation?: InvoiceValidation;
  /** Multi-factor confidence engine */
  confidence_detail?: ConfidenceResult;
  ocr_meds_confidence?: ConfidenceResult;
  invoice_confidence?: ConfidenceResult;
};

function lineToFormValue(line: ParsedMedLine): string {
  const name = line.matched_name || line.clean_name || line.raw;
  const qty = line.qty && line.qty > 0 ? line.qty : 1;
  if (qty !== 1) return `${qty} ${name}`.trim();
  return name.trim();
}

function legacyFromBand(
  band: ConfidenceResult['band']
): 'high' | 'medium' | 'low' {
  if (band === 'auto') return 'high';
  if (band === 'review') return 'medium';
  return 'low';
}

export function ocrResultToFormFields(
  result: OcrResult | OcrResult[],
  opts?: {
    maxMeds?: number;
    formulary_estimate_egp?: number | null;
  }
): FormFieldMapping {
  const results = Array.isArray(result) ? result : [result];
  const maxMeds = opts?.maxMeds ?? CONFIG.MAX_MEDS;

  const allLines: ParsedMedLine[] = [];
  const roshetta_urls: string[] = [];
  const invoice_urls: string[] = [];
  let invoice: InvoiceParseResult | undefined;

  for (const r of results) {
    if (!r.ok && !r.lines?.length) continue;
    if (r.doc_kind === 'invoice' || r.invoice) {
      if (r.source_url) invoice_urls.push(r.source_url);
      if (r.invoice) invoice = r.invoice;
    } else if (r.source_url) {
      roshetta_urls.push(r.source_url);
    }
    for (const line of r.lines || []) {
      if (line.clean_name || line.raw) allLines.push(line);
    }
  }

  const seen = new Set<string>();
  const ranked = [...allLines].sort(
    (a, b) => (b.match_score || 0) - (a.match_score || 0)
  );
  const unique: ParsedMedLine[] = [];
  for (const line of ranked) {
    const key = (line.matched_name || line.clean_name || line.raw)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
    if (unique.length >= maxMeds) break;
  }

  const med_slots: FormMedSlot[] = unique.map((line, i) => ({
    slot: 20 + i,
    form_value: lineToFormValue(line),
    raw_ocr: line.raw,
    clean_name: line.clean_name,
    qty: line.qty > 0 ? line.qty : 1,
    frequency_hint: line.frequency_hint,
    matched_name: line.matched_name,
    match_score: line.match_score,
    formulary_hint: line.formulary_hint,
  }));

  const med_fields = med_slots.map((s) => s.form_value);

  let invoice_validation: InvoiceValidation | undefined;
  if (invoice) {
    invoice_validation = validateInvoiceTotal({
      invoice,
      formulary_estimate_egp: opts?.formulary_estimate_egp ?? null,
    });
  }

  const ocr_meds_confidence = ocrMedsConfidence({
    matchScores: med_slots.map((s) => s.match_score || 0),
    lineCount: med_slots.length,
    maxMeds,
  });
  const invoice_confidence = invoice_validation
    ? invoiceConfidence(invoice_validation)
    : null;
  const confidence_detail = requestConfidence({
    ocrMeds: ocr_meds_confidence,
    invoice: invoice_confidence,
  });

  const confidence = legacyFromBand(confidence_detail.band);

  const notesParts: string[] = [];
  if (med_slots.length) {
    notesParts.push(`OCR meds: ${med_fields.join('; ')}`);
  }
  if (invoice?.total_egp != null) {
    notesParts.push(`OCR invoice total: ${invoice.total_egp} EGP`);
  }
  if (invoice_validation) {
    notesParts.push(`invoice validation: ${invoice_validation.status}`);
    if (invoice_validation.vs_formulary_pct != null) {
      notesParts.push(`vs formulary Δ ${invoice_validation.vs_formulary_pct}%`);
    }
  }
  notesParts.push(confidence_detail.summary);
  if (invoice?.pharmacy_hint) {
    notesParts.push(`OCR pharmacy: ${invoice.pharmacy_hint}`);
  }
  if (roshetta_urls.length) {
    notesParts.push(`روشتة: ${roshetta_urls.join(', ')}`);
  }
  if (invoice_urls.length) {
    notesParts.push(`فاتورة: ${invoice_urls.join(', ')}`);
  }

  const needs_review =
    confidence_detail.band !== 'auto' ||
    med_slots.length === 0 ||
    (invoice_validation != null && invoice_validation.status !== 'pass');

  return {
    med_fields,
    med_slots,
    notes_fragment: notesParts.join(' | '),
    invoice_total_egp: invoice?.total_egp ?? null,
    pharmacy_hint: invoice?.pharmacy_hint ?? null,
    roshetta_urls,
    invoice_urls,
    confidence,
    needs_review,
    invoice_validation,
    confidence_detail,
    ocr_meds_confidence,
    invoice_confidence: invoice_confidence || undefined,
  };
}

export function mergeOcrIntoFormMeds(
  existingMeds: string[],
  mapping: FormFieldMapping,
  opts?: { force?: boolean }
): { meds: string[]; used_ocr: boolean } {
  const filled = existingMeds.filter((m) => m && String(m).trim());
  if (filled.length > 0 && !opts?.force) {
    return { meds: filled, used_ocr: false };
  }
  if (mapping.med_fields.length === 0) {
    return { meds: filled, used_ocr: false };
  }
  return { meds: mapping.med_fields, used_ocr: true };
}
