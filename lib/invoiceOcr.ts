/**
 * Invoice OCR helpers — extract totals / pharmacy hints from pharmacy bills.
 * Ops aid only; amounts must be verified against the original image.
 */

export type InvoiceParseResult = {
  full_text: string;
  total_egp: number | null;
  subtotal_egp: number | null;
  tax_egp: number | null;
  currency_hints: string[];
  pharmacy_hint: string | null;
  date_hint: string | null;
  line_candidates: string[];
  /** Amounts found on non-total lines (for cross-check) */
  line_amounts: number[];
};

export type InvoiceValidationStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export type InvoiceValidation = {
  status: InvoiceValidationStatus;
  /** OCR / labeled total */
  ocr_total_egp: number | null;
  /** Sum of numeric amounts on item-like lines (if any) */
  lines_sum_egp: number | null;
  /** unitPrice × qty from formulary for mapped meds */
  formulary_estimate_egp: number | null;
  /** |ocr - lines_sum| / ocr */
  vs_lines_pct: number | null;
  /** |ocr - formulary| / ocr */
  vs_formulary_pct: number | null;
  /** |ocr - (subtotal+tax)| when both present */
  vs_subtotal_tax_pct: number | null;
  messages: string[];
  ok_for_auto_price: boolean;
};

function parseNum(s: string): number | null {
  let t = s.replace(/\s/g, '');
  if (/\d\.\d{3},\d/.test(t)) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/\d,\d{3}\.\d/.test(t)) {
    t = t.replace(/,/g, '');
  } else if (/^\d+,\d{1,2}$/.test(t)) {
    t = t.replace(',', '.');
  } else {
    t = t.replace(/,/g, '');
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

const AMOUNT_RE =
  /(?:EGP|ج\.?م\.?|LE|L\.E\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:EGP|ج\.?م\.?|LE)?/gi;

function amountsInLine(line: string): number[] {
  const out: number[] = [];
  AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_RE.exec(line))) {
    const n = parseNum(m[1]);
    if (n != null && n > 0 && n < 1_000_000) out.push(n);
  }
  return out;
}

/** Parse OCR text of a pharmacy invoice for total EGP and metadata. */
export function parseInvoiceText(fullText: string): InvoiceParseResult {
  const text = String(fullText || '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let total_egp: number | null = null;
  let subtotal_egp: number | null = null;
  let tax_egp: number | null = null;
  const currency_hints: string[] = [];
  const line_amounts: number[] = [];

  const totalLabel =
    /(?:الإجمالي|اجمالي|الصافي|المطلوب|grand\s*total|total\s*due|amount\s*due|\btotal\b|net\s*amount|قيمة\s*الفاتورة)/i;
  const subtotalLabel = /(?:sub\s*total|المجموع|قبل\s*الضريبة|صافي\s*البضاعة)/i;
  const taxLabel = /(?:VAT|ضريبة|tax|14\s*%|ض\.?ق\.?م)/i;

  const candidates: number[] = [];

  for (const line of lines) {
    const amts = amountsInLine(line);
    if (!amts.length) continue;

    if (totalLabel.test(line) && !subtotalLabel.test(line)) {
      total_egp = amts[amts.length - 1];
      candidates.push(...amts);
    } else if (subtotalLabel.test(line)) {
      subtotal_egp = amts[amts.length - 1];
    } else if (taxLabel.test(line)) {
      tax_egp = amts[amts.length - 1];
    } else if (
      /[A-Za-z]{3,}|قرص|علبة|شريط|mg|tab|عبوة|علبه/i.test(line) &&
      !/tel|phone|تاريخ|date|فاتورة\s*رقم/i.test(line)
    ) {
      // Likely item line — take last amount on the line as line total
      line_amounts.push(amts[amts.length - 1]);
    }

    if (/EGP|ج\.?م|LE/i.test(line)) currency_hints.push(line.slice(0, 80));
  }

  if (total_egp == null && candidates.length) {
    total_egp = Math.max(...candidates);
  }
  // Fallback: largest amount on the whole document if nothing labeled
  if (total_egp == null) {
    const all: number[] = [];
    for (const line of lines) all.push(...amountsInLine(line));
    if (all.length) total_egp = Math.max(...all);
  }

  let pharmacy_hint: string | null = null;
  for (const line of lines.slice(0, 8)) {
    if (line.length < 4) continue;
    if (/^\d/.test(line)) continue;
    if (/فاتورة|invoice|tax|ضريبة|tel|phone|تاريخ/i.test(line)) continue;
    if (/[A-Za-z\u0600-\u06FF]{3,}/.test(line)) {
      pharmacy_hint = line.slice(0, 80);
      break;
    }
  }

  let date_hint: string | null = null;
  const dateRe =
    /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/;
  for (const line of lines) {
    const dm = line.match(dateRe);
    if (dm) {
      date_hint = dm[1];
      break;
    }
  }

  const line_candidates = lines
    .filter((l) => /[A-Za-z]{3,}|قرص|علبة|شريط|mg|tab/i.test(l))
    .slice(0, 30);

  return {
    full_text: text,
    total_egp,
    subtotal_egp,
    tax_egp,
    currency_hints: [...new Set(currency_hints)].slice(0, 5),
    pharmacy_hint,
    date_hint,
    line_candidates,
    line_amounts,
  };
}

function pctDiff(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100;
  return (Math.abs(a - b) / Math.abs(a)) * 100;
}

/**
 * Validate OCR invoice total against line amounts and formulary estimate.
 *
 * Defaults: warn if variance > 8%, fail if > 25% (tunable via env).
 */
export function validateInvoiceTotal(input: {
  invoice: InvoiceParseResult;
  /** Sum of unitPrice × qty for OCR/form meds */
  formulary_estimate_egp?: number | null;
  warn_pct?: number;
  fail_pct?: number;
}): InvoiceValidation {
  const warnPct = input.warn_pct ?? Number(process.env.INVOICE_WARN_PCT || 8);
  const failPct = input.fail_pct ?? Number(process.env.INVOICE_FAIL_PCT || 25);
  const inv = input.invoice;
  const ocr = inv.total_egp;
  const messages: string[] = [];

  const lines_sum =
    inv.line_amounts.length >= 2
      ? Math.round(inv.line_amounts.reduce((a, b) => a + b, 0) * 100) / 100
      : inv.line_amounts.length === 1
        ? inv.line_amounts[0]
        : null;

  const formulary =
    input.formulary_estimate_egp != null &&
    Number.isFinite(input.formulary_estimate_egp)
      ? Math.round(Number(input.formulary_estimate_egp) * 100) / 100
      : null;

  let vs_lines_pct: number | null = null;
  let vs_formulary_pct: number | null = null;
  let vs_subtotal_tax_pct: number | null = null;

  if (ocr != null && lines_sum != null) {
    vs_lines_pct = Math.round(pctDiff(ocr, lines_sum) * 10) / 10;
    messages.push(
      `OCR total ${ocr} vs item lines sum ${lines_sum} (Δ ${vs_lines_pct}%)`
    );
  } else if (lines_sum == null) {
    messages.push('No reliable item-line amounts to sum');
  }

  if (ocr != null && formulary != null && formulary > 0) {
    vs_formulary_pct = Math.round(pctDiff(ocr, formulary) * 10) / 10;
    messages.push(
      `OCR total ${ocr} vs formulary estimate ${formulary} (Δ ${vs_formulary_pct}%)`
    );
  }

  if (ocr != null && inv.subtotal_egp != null && inv.tax_egp != null) {
    const st = Math.round((inv.subtotal_egp + inv.tax_egp) * 100) / 100;
    vs_subtotal_tax_pct = Math.round(pctDiff(ocr, st) * 10) / 10;
    messages.push(
      `OCR total ${ocr} vs subtotal+tax ${st} (Δ ${vs_subtotal_tax_pct}%)`
    );
  }

  if (ocr == null) {
    return {
      status: 'unknown',
      ocr_total_egp: null,
      lines_sum_egp: lines_sum,
      formulary_estimate_egp: formulary,
      vs_lines_pct,
      vs_formulary_pct,
      vs_subtotal_tax_pct,
      messages: ['No OCR total detected', ...messages],
      ok_for_auto_price: false,
    };
  }

  const deltas = [vs_lines_pct, vs_formulary_pct, vs_subtotal_tax_pct].filter(
    (x): x is number => x != null
  );
  const worst = deltas.length ? Math.max(...deltas) : null;

  let status: InvoiceValidationStatus = 'unknown';
  if (worst == null) {
    status = 'warn';
    messages.push('Total found but no cross-check available — verify manually');
  } else if (worst > failPct) {
    status = 'fail';
    messages.push(`Variance ${worst}% exceeds fail threshold ${failPct}%`);
  } else if (worst > warnPct) {
    status = 'warn';
    messages.push(`Variance ${worst}% exceeds warn threshold ${warnPct}%`);
  } else {
    status = 'pass';
    messages.push(`Within ${warnPct}% tolerance`);
  }

  return {
    status,
    ocr_total_egp: ocr,
    lines_sum_egp: lines_sum,
    formulary_estimate_egp: formulary,
    vs_lines_pct,
    vs_formulary_pct,
    vs_subtotal_tax_pct,
    messages,
    ok_for_auto_price: status === 'pass',
  };
}
