/**
 * Invoice OCR parse + total validation.
 * Ops aid only — always verify against the original pharmacy invoice image.
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
  line_amounts: number[];
  /** true if total came from an explicit label (الإجمالي / total) */
  total_from_label: boolean;
};

export type InvoiceValidationStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export type InvoiceValidation = {
  status: InvoiceValidationStatus;
  ocr_total_egp: number | null;
  lines_sum_egp: number | null;
  formulary_estimate_egp: number | null;
  subtotal_plus_tax_egp: number | null;
  vs_lines_pct: number | null;
  vs_formulary_pct: number | null;
  vs_subtotal_tax_pct: number | null;
  vs_lines_egp: number | null;
  vs_formulary_egp: number | null;
  cross_checks: number;
  confidence: number;
  messages: string[];
  ok_for_auto_price: boolean;
  thresholds: {
    warn_pct: number;
    fail_pct: number;
    warn_egp: number;
    fail_egp: number;
  };
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

export function parseInvoiceText(fullText: string): InvoiceParseResult {
  const text = String(fullText || '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let total_egp: number | null = null;
  let total_from_label = false;
  let subtotal_egp: number | null = null;
  let tax_egp: number | null = null;
  const currency_hints: string[] = [];
  const line_amounts: number[] = [];

  const totalLabel =
    /(?:الإجمالي|اجمالي|الصافي|المطلوب|القيمة\s*المطلوبة|grand\s*total|total\s*due|amount\s*due|\btotal\b|net\s*amount|قيمة\s*الفاتورة|الإجمالى)/i;
  const subtotalLabel =
    /(?:sub\s*total|المجموع(?!\s*الكلي)|قبل\s*الضريبة|صافي\s*البضاعة|قيمة\s*الأصناف)/i;
  const taxLabel = /(?:VAT|ضريبة|tax|14\s*%|ض\.?ق\.?م|ضريبة\s*القيمة)/i;

  const labeledTotals: number[] = [];

  for (const line of lines) {
    const amts = amountsInLine(line);
    if (!amts.length) continue;

    if (totalLabel.test(line) && !subtotalLabel.test(line)) {
      const v = amts[amts.length - 1];
      total_egp = v;
      total_from_label = true;
      labeledTotals.push(v);
    } else if (subtotalLabel.test(line)) {
      subtotal_egp = amts[amts.length - 1];
    } else if (taxLabel.test(line)) {
      tax_egp = amts[amts.length - 1];
    } else if (
      /[A-Za-z]{3,}|قرص|علبة|شريط|mg|tab|عبوة|علبه|كبسول|شراب/i.test(line) &&
      !/tel|phone|تاريخ|date|فاتورة\s*رقم|invoice\s*no/i.test(line)
    ) {
      line_amounts.push(amts[amts.length - 1]);
    }

    if (/EGP|ج\.?م|LE/i.test(line)) currency_hints.push(line.slice(0, 80));
  }

  if (total_egp == null && labeledTotals.length) {
    total_egp = Math.max(...labeledTotals);
    total_from_label = true;
  }

  // Prefer subtotal+tax as total if no explicit total but both present
  if (total_egp == null && subtotal_egp != null && tax_egp != null) {
    total_egp = Math.round((subtotal_egp + tax_egp) * 100) / 100;
    total_from_label = true;
  }

  // Last resort: largest amount on document (weak signal)
  if (total_egp == null) {
    const all: number[] = [];
    for (const line of lines) all.push(...amountsInLine(line));
    if (all.length) {
      total_egp = Math.max(...all);
      total_from_label = false;
    }
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
    total_from_label,
  };
}

function pctDiff(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100;
  return (Math.abs(a - b) / Math.abs(a)) * 100;
}

function severity(
  pct: number | null,
  abs: number | null,
  warnPct: number,
  failPct: number,
  warnEgp: number,
  failEgp: number
): InvoiceValidationStatus | null {
  if (pct == null && abs == null) return null;
  const p = pct ?? 0;
  const a = abs ?? 0;
  if (p > failPct || a > failEgp) return 'fail';
  if (p > warnPct || a > warnEgp) return 'warn';
  return 'pass';
}

function rank(s: InvoiceValidationStatus): number {
  if (s === 'fail') return 3;
  if (s === 'warn') return 2;
  if (s === 'pass') return 1;
  return 0;
}

/**
 * Validate OCR invoice total against:
 * 1) sum of item-line amounts
 * 2) formulary unit×qty estimate
 * 3) subtotal + tax when both present
 *
 * Pass requires at least one cross-check within thresholds.
 * Unlabeled “max amount on page” totals cannot pass (warn at best).
 */
export function validateInvoiceTotal(input: {
  invoice: InvoiceParseResult;
  formulary_estimate_egp?: number | null;
  warn_pct?: number;
  fail_pct?: number;
  warn_egp?: number;
  fail_egp?: number;
}): InvoiceValidation {
  const warnPct = input.warn_pct ?? Number(process.env.INVOICE_WARN_PCT || 8);
  const failPct = input.fail_pct ?? Number(process.env.INVOICE_FAIL_PCT || 25);
  const warnEgp = input.warn_egp ?? Number(process.env.INVOICE_WARN_EGP || 50);
  const failEgp = input.fail_egp ?? Number(process.env.INVOICE_FAIL_EGP || 200);
  const thresholds = {
    warn_pct: warnPct,
    fail_pct: failPct,
    warn_egp: warnEgp,
    fail_egp: failEgp,
  };

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
    Number.isFinite(input.formulary_estimate_egp) &&
    Number(input.formulary_estimate_egp) > 0
      ? Math.round(Number(input.formulary_estimate_egp) * 100) / 100
      : null;

  const subtotal_plus_tax =
    inv.subtotal_egp != null && inv.tax_egp != null
      ? Math.round((inv.subtotal_egp + inv.tax_egp) * 100) / 100
      : null;

  let vs_lines_pct: number | null = null;
  let vs_formulary_pct: number | null = null;
  let vs_subtotal_tax_pct: number | null = null;
  let vs_lines_egp: number | null = null;
  let vs_formulary_egp: number | null = null;

  const checkStatuses: InvoiceValidationStatus[] = [];

  if (ocr != null && lines_sum != null) {
    vs_lines_pct = Math.round(pctDiff(ocr, lines_sum) * 10) / 10;
    vs_lines_egp = Math.round(Math.abs(ocr - lines_sum) * 100) / 100;
    messages.push(
      `OCR total ${ocr} vs item lines sum ${lines_sum} (Δ ${vs_lines_pct}% / ${vs_lines_egp} EGP)`
    );
    const s = severity(
      vs_lines_pct,
      vs_lines_egp,
      warnPct,
      failPct,
      warnEgp,
      failEgp
    );
    if (s) checkStatuses.push(s);
  } else {
    messages.push('No reliable item-line amounts to sum');
  }

  if (ocr != null && formulary != null) {
    vs_formulary_pct = Math.round(pctDiff(ocr, formulary) * 10) / 10;
    vs_formulary_egp = Math.round(Math.abs(ocr - formulary) * 100) / 100;
    messages.push(
      `OCR total ${ocr} vs formulary estimate ${formulary} (Δ ${vs_formulary_pct}% / ${vs_formulary_egp} EGP)`
    );
    const s = severity(
      vs_formulary_pct,
      vs_formulary_egp,
      warnPct,
      failPct,
      warnEgp,
      failEgp
    );
    if (s) checkStatuses.push(s);
  }

  if (ocr != null && subtotal_plus_tax != null) {
    vs_subtotal_tax_pct =
      Math.round(pctDiff(ocr, subtotal_plus_tax) * 10) / 10;
    messages.push(
      `OCR total ${ocr} vs subtotal+tax ${subtotal_plus_tax} (Δ ${vs_subtotal_tax_pct}%)`
    );
    const s = severity(
      vs_subtotal_tax_pct,
      Math.abs(ocr - subtotal_plus_tax),
      warnPct,
      failPct,
      warnEgp,
      failEgp
    );
    if (s) checkStatuses.push(s);
  }

  const cross_checks = checkStatuses.length;

  if (ocr == null) {
    return {
      status: 'unknown',
      ocr_total_egp: null,
      lines_sum_egp: lines_sum,
      formulary_estimate_egp: formulary,
      subtotal_plus_tax_egp: subtotal_plus_tax,
      vs_lines_pct,
      vs_formulary_pct,
      vs_subtotal_tax_pct,
      vs_lines_egp,
      vs_formulary_egp,
      cross_checks: 0,
      confidence: 0,
      messages: ['No OCR total detected', ...messages],
      ok_for_auto_price: false,
      thresholds,
    };
  }

  if (!inv.total_from_label) {
    messages.push(
      'Total was inferred (largest amount on page), not an explicit label'
    );
  }

  let status: InvoiceValidationStatus;
  if (cross_checks === 0) {
    status = 'warn';
    messages.push('Total found but no cross-check available — verify manually');
  } else {
    status = checkStatuses.reduce((a, b) => (rank(b) > rank(a) ? b : a), 'pass');
    if (status === 'pass') messages.push(`Within tolerance (${warnPct}% / ${warnEgp} EGP)`);
    if (status === 'warn')
      messages.push(`Exceeds warn threshold (${warnPct}% or ${warnEgp} EGP)`);
    if (status === 'fail')
      messages.push(`Exceeds fail threshold (${failPct}% or ${failEgp} EGP)`);
  }

  // Unlabeled totals cannot auto-price even if numbers align
  if (!inv.total_from_label && status === 'pass') {
    status = 'warn';
    messages.push('Downgraded to warn: unlabeled total');
  }

  // Confidence 0–1
  let confidence = 0.2;
  if (inv.total_from_label) confidence += 0.25;
  if (cross_checks >= 1) confidence += 0.2;
  if (cross_checks >= 2) confidence += 0.15;
  if (status === 'pass') confidence += 0.2;
  if (status === 'fail') confidence = Math.min(confidence, 0.35);
  confidence = Math.round(Math.min(1, confidence) * 100) / 100;

  return {
    status,
    ocr_total_egp: ocr,
    lines_sum_egp: lines_sum,
    formulary_estimate_egp: formulary,
    subtotal_plus_tax_egp: subtotal_plus_tax,
    vs_lines_pct,
    vs_formulary_pct,
    vs_subtotal_tax_pct,
    vs_lines_egp,
    vs_formulary_egp,
    cross_checks,
    confidence,
    messages,
    ok_for_auto_price: status === 'pass' && inv.total_from_label && cross_checks >= 1,
    thresholds,
  };
}

/**
 * Use OCR total for price only when validation says so.
 * Otherwise keep formulary/unit price.
 */
export function applyValidatedInvoicePrice(input: {
  validation: InvoiceValidation | null | undefined;
  currentPriceTotal: number | string | null;
  singleMedLine: boolean;
}): { priceTotal: number | string | null; applied: boolean; reason: string } {
  const cur = input.currentPriceTotal;
  const v = input.validation;
  if (!v || !v.ok_for_auto_price || v.ocr_total_egp == null) {
    return {
      priceTotal: cur,
      applied: false,
      reason: v ? `validation_${v.status}` : 'no_validation',
    };
  }
  if (!input.singleMedLine) {
    return {
      priceTotal: cur,
      applied: false,
      reason: 'multi_line_skip',
    };
  }
  if (cur !== null && cur !== '' && typeof cur === 'number' && cur > 0) {
    // Prefer keeping formulary if already set and close
    const delta = Math.abs(cur - v.ocr_total_egp);
    if (delta <= (v.thresholds?.warn_egp ?? 50)) {
      return { priceTotal: cur, applied: false, reason: 'keep_formulary_close' };
    }
  }
  return {
    priceTotal: v.ocr_total_egp,
    applied: true,
    reason: 'ocr_invoice_validated',
  };
}
