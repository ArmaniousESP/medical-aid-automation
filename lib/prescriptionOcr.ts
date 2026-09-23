/**
 * Prescription (roshetta) + invoice OCR pipeline.
 *
 * Providers (first available wins):
 * 1. Google Cloud Vision REST — GOOGLE_VISION_API_KEY or GOOGLE_API_KEY
 * 2. OCR.space — OCR_SPACE_API_KEY
 * 3. Manual text paste (no provider)
 *
 * Ops aid only — always human-verify extracted lines before enroll/approve.
 */

import { parseQuantity, bestMedMatch, type MedEntry } from '@/lib/matching';
import { expandDrugTokens } from '@/lib/drugSynonyms';
import { parseInvoiceText, type InvoiceParseResult } from '@/lib/invoiceOcr';
import { downloadDriveFile } from '@/lib/driveDownload';
import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

export type OcrProvider = 'google_vision' | 'ocr_space' | 'manual' | 'none';

export type ParsedMedLine = {
  raw: string;
  clean_name: string;
  qty: number;
  frequency_hint: string | null;
  matched_name: string | null;
  match_score: number;
  formulary_hint: string | null;
};

export type OcrResult = {
  ok: boolean;
  provider: OcrProvider;
  source_url?: string;
  full_text: string;
  lines: ParsedMedLine[];
  doc_kind?: 'prescription' | 'invoice' | 'unknown';
  invoice?: InvoiceParseResult;
  download_via?: string;
  error?: string;
  disclaimer: string;
};

const DISCLAIMER =
  'OCR is probabilistic. Verify every line against the original roshetta/invoice before processing.';

/** Convert common Google Drive share links to a direct download URL when possible. */
export function driveToDirectUrl(url: string): string {
  const u = String(url || '').trim();
  if (!u) return u;

  let m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) {
    return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }

  m = u.match(/[?&]id=([^&]+)/);
  if (m && /drive\.google\.com/.test(u)) {
    return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }

  return u;
}

export async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mime: string; via?: string }> {
  // Prefer Drive SA for form attachments
  if (/drive\.google\.com|docs\.google\.com/i.test(url) || /^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    try {
      const d = await downloadDriveFile(url);
      return { base64: d.base64, mime: d.mime, via: d.via };
    } catch {
      /* fall through */
    }
  }

  const direct = driveToDirectUrl(url);
  const { response } = await fetchWithRetry(
    direct,
    {
      headers: {
        'User-Agent': 'medical-aid-automation/1.0',
        Accept: 'image/*,*/*',
      },
      redirect: 'follow',
    },
    webhookRetryDefaults()
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length < 100) {
    throw new Error('Downloaded file too small — link may require auth');
  }
  if (buf.length > 12 * 1024 * 1024) {
    throw new Error('Image exceeds 12MB limit');
  }
  const mime =
    response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  if (!/^image\//i.test(mime) && !/octet-stream/i.test(mime)) {
    const head = buf.slice(0, 200).toString('utf8');
    if (/<html/i.test(head)) {
      throw new Error(
        'Got HTML instead of image — share with service account or make Drive file public'
      );
    }
  }
  return {
    base64: buf.toString('base64'),
    mime: mime.startsWith('image/') ? mime : 'image/jpeg',
    via: 'public_url',
  };
}

async function ocrGoogleVision(base64: string): Promise<string> {
  const key =
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GCP_API_KEY;
  if (!key) throw new Error('No Google Vision API key');

  const { response } = await fetchWithRetry(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: {
              languageHints: ['ar', 'en'],
            },
          },
        ],
      }),
    },
    webhookRetryDefaults()
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Vision HTTP ${response.status}`);
  }
  const err = data?.responses?.[0]?.error;
  if (err) throw new Error(err.message || 'Vision error');
  const text =
    data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description ||
    '';
  return String(text).trim();
}

async function ocrSpace(base64: string, mime: string): Promise<string> {
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key) throw new Error('No OCR_SPACE_API_KEY');

  const form = new URLSearchParams();
  form.set('base64Image', `data:${mime};base64,${base64}`);
  form.set('language', 'ara');
  form.set('isOverlayRequired', 'false');
  form.set('OCREngine', '2');
  form.set('scale', 'true');
  form.set('detectOrientation', 'true');

  const { response } = await fetchWithRetry(
    'https://api.ocr.space/parse/image',
    {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    },
    webhookRetryDefaults()
  );
  const data = await response.json();
  if (data?.IsErroredOnProcessing) {
    throw new Error(
      Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join('; ')
        : String(data.ErrorMessage || 'OCR.space error')
    );
  }
  const text = data?.ParsedResults?.[0]?.ParsedText || '';
  return String(text).trim();
}

export function hasOcrProvider(): { google: boolean; ocr_space: boolean } {
  return {
    google: !!(
      process.env.GOOGLE_VISION_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GCP_API_KEY
    ),
    ocr_space: !!process.env.OCR_SPACE_API_KEY,
  };
}

function detectDocKind(
  hint: string | undefined,
  fullText: string
): 'prescription' | 'invoice' | 'unknown' {
  if (hint === 'invoice' || hint === 'prescription') return hint;
  if (/فاتورة|invoice|إجمالي|VAT|ضريبة|المطلوب|grand\s*total/i.test(fullText)) {
    return 'invoice';
  }
  if (/روشتة|Rx\b|mg\b|قرص|مرة|tab\b|prescription/i.test(fullText)) {
    return 'prescription';
  }
  return 'unknown';
}

/** Heuristic: drop headers, extract likely med lines from OCR text */
export function extractMedCandidateLines(fullText: string): string[] {
  const rawLines = String(fullText || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const skip =
    /^(patient|name|age|date|dr\.?|doctor|signature|rx|السن|العمر|الاسم|التاريخ|التشخيص|عيادة|مستشفى|د\.|ص\.|tel|phone|رقم)/i;

  const out: string[] = [];
  for (const line of rawLines) {
    if (line.length < 3) continue;
    if (skip.test(line)) continue;
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(line)) continue;
    const hasLatin = /[A-Za-z]{3,}/.test(line);
    const hasDigits = /\d/.test(line);
    const hasArabicMed =
      /قرص|كبس|شراب|حقن|بخاخ|مرهم|علبة|شريط|مرة|يوم|صباحا|مساء|mg|MG|tab|TAB/i.test(
        line
      );
    if (hasLatin || hasArabicMed || (hasDigits && line.length > 5)) {
      out.push(line);
    }
  }

  const expanded: string[] = [];
  for (const l of out) {
    const parts = l
      .split(/\s*[;•|]\s*/)
      .map((p) => p.trim())
      .filter((p) => p.length > 2);
    if (parts.length > 1) expanded.push(...parts);
    else expanded.push(l);
  }

  return [...new Set(expanded)].slice(0, 40);
}

function frequencyHint(line: string): string | null {
  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /مرة\s*يوميا|once\s*daily|od\b|1\s*x\s*1/i, label: 'once daily' },
    { re: /مرتين|twice|bid\b|2\s*x\s*1/i, label: 'twice daily' },
    { re: /ثلاث\s*مرات|tid\b|3\s*x/i, label: 'three times daily' },
    { re: /كل\s*يوم|daily/i, label: 'daily' },
    { re: /اسبوع|weekly|qw\b/i, label: 'weekly' },
    { re: /صباحا|morning/i, label: 'morning' },
    { re: /مساء|evening|night/i, label: 'evening' },
  ];
  for (const p of patterns) {
    if (p.re.test(line)) return p.label;
  }
  return null;
}

export async function parseOcrTextToMedLines(
  fullText: string,
  medDb?: MedEntry[]
): Promise<ParsedMedLine[]> {
  const candidates = extractMedCandidateLines(fullText);
  const lines: ParsedMedLine[] = [];

  for (const raw of candidates) {
    const { qty, cleanName } = parseQuantity(raw);
    let matched_name: string | null = null;
    let match_score = 0;
    let formulary_hint: string | null = null;

    if (medDb && medDb.length && cleanName) {
      const m = bestMedMatch(cleanName, medDb);
      matched_name = m.name;
      match_score = m.score;
      formulary_hint = m.eva;
    }

    try {
      const exp = await expandDrugTokens(cleanName || raw);
      if (!matched_name && exp.resolved_ingredient) {
        matched_name = exp.resolved_ingredient;
        match_score = Math.max(match_score, 0.5);
      }
    } catch {
      /* optional */
    }

    lines.push({
      raw,
      clean_name: cleanName || raw,
      qty,
      frequency_hint: frequencyHint(raw),
      matched_name,
      match_score,
      formulary_hint,
    });
  }

  return lines;
}

export async function runPrescriptionOcr(input: {
  imageUrl?: string;
  imageBase64?: string;
  mime?: string;
  text?: string;
  medDb?: MedEntry[];
  /** Force invoice parsing path */
  docKind?: 'prescription' | 'invoice' | 'auto';
}): Promise<OcrResult> {
  let full_text = '';
  let provider: OcrProvider = 'none';
  let source_url = input.imageUrl;
  let download_via: string | undefined;

  try {
    if (input.text && input.text.trim().length > 5) {
      full_text = input.text.trim();
      provider = 'manual';
    } else {
      let base64 = input.imageBase64;
      let mime = input.mime || 'image/jpeg';

      if (!base64 && input.imageUrl) {
        const fetched = await fetchImageAsBase64(input.imageUrl);
        base64 = fetched.base64;
        mime = fetched.mime;
        download_via = fetched.via;
      }
      if (!base64) {
        return {
          ok: false,
          provider: 'none',
          full_text: '',
          lines: [],
          error: 'Provide imageUrl, imageBase64, or text',
          disclaimer: DISCLAIMER,
        };
      }

      const avail = hasOcrProvider();
      if (avail.google) {
        full_text = await ocrGoogleVision(base64);
        provider = 'google_vision';
      } else if (avail.ocr_space) {
        full_text = await ocrSpace(base64, mime);
        provider = 'ocr_space';
      } else {
        return {
          ok: false,
          provider: 'none',
          source_url,
          full_text: '',
          lines: [],
          error:
            'No OCR provider configured. Set GOOGLE_VISION_API_KEY (or GOOGLE_API_KEY) or OCR_SPACE_API_KEY, or paste text.',
          disclaimer: DISCLAIMER,
        };
      }
    }

    const kind = detectDocKind(
      input.docKind === 'auto' ? undefined : input.docKind,
      full_text
    );
    const lines = await parseOcrTextToMedLines(full_text, input.medDb);
    const invoice =
      kind === 'invoice' || input.docKind === 'invoice'
        ? parseInvoiceText(full_text)
        : undefined;

    return {
      ok: true,
      provider,
      source_url,
      full_text,
      lines,
      doc_kind: kind,
      invoice,
      download_via,
      disclaimer: DISCLAIMER,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider,
      source_url,
      full_text,
      lines: [],
      download_via,
      error: e instanceof Error ? e.message : 'OCR failed',
      disclaimer: DISCLAIMER,
    };
  }
}

/** OCR several Drive/image URLs (roshetta + invoices from one form response). */
export async function runBatchOcr(input: {
  urls: string[];
  medDb?: MedEntry[];
  docKind?: 'prescription' | 'invoice' | 'auto';
}): Promise<{ results: OcrResult[]; ok_count: number }> {
  const urls = [...new Set(input.urls.map((u) => u.trim()).filter(Boolean))].slice(
    0,
    8
  );
  const results: OcrResult[] = [];
  for (const url of urls) {
    results.push(
      await runPrescriptionOcr({
        imageUrl: url,
        medDb: input.medDb,
        docKind: input.docKind || 'auto',
      })
    );
  }
  return {
    results,
    ok_count: results.filter((r) => r.ok).length,
  };
}
