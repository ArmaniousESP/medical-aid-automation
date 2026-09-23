/**
 * Invoice OCR helpers — extract totals / pharmacy hints from pharmacy bills.
 * Ops aid only; amounts must be verified against the original image.
 */

export type InvoiceParseResult = {
  full_text: string;
  total_egp: number | null;
  currency_hints: string[];
  pharmacy_hint: string | null;
  date_hint: string | null;
  line_candidates: string[];
};

/** Parse OCR text of a pharmacy invoice for total EGP and metadata. */
export function parseInvoiceText(fullText: string): InvoiceParseResult {
  const text = String(fullText || '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let total_egp: number | null = null;
  const currency_hints: string[] = [];

  // Prefer lines labeled total / الإجمالي / الصافي
  const totalLabel =
    /(?:الإجمالي|اجمالي|الصافي|المطلوب|grand\s*total|total|net|amount\s*due|قيمة)/i;

  const amountRe =
    /(?:EGP|ج\.?م\.?|LE|L\.E\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:EGP|ج\.?م\.?|LE)?/gi;

  function parseNum(s: string): number | null {
    let t = s.replace(/\s/g, '');
    // Egyptian style: 1.250,50 or 1,250.50
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

  const candidates: number[] = [];
  for (const line of lines) {
    if (!totalLabel.test(line) && !/EGP|ج\.?م|LE/i.test(line)) continue;
    amountRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = amountRe.exec(line))) {
      const n = parseNum(m[1]);
      if (n != null && n > 0 && n < 1_000_000) {
        candidates.push(n);
        if (totalLabel.test(line)) total_egp = n;
      }
    }
    if (/EGP|ج\.?م|LE/i.test(line)) currency_hints.push(line.slice(0, 80));
  }

  if (total_egp == null && candidates.length) {
    total_egp = Math.max(...candidates);
  }

  // Pharmacy name: first non-numeric header-ish line
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
    currency_hints: [...new Set(currency_hints)].slice(0, 5),
    pharmacy_hint,
    date_hint,
    line_candidates,
  };
}
