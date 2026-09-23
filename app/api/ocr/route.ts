import { NextRequest, NextResponse } from 'next/server';
import {
  runPrescriptionOcr,
  runBatchOcr,
  hasOcrProvider,
  parseOcrTextToMedLines,
} from '@/lib/prescriptionOcr';
import { parseInvoiceText, validateInvoiceTotal } from '@/lib/invoiceOcr';
import { ocrResultToFormFields } from '@/lib/ocrToFormFields';
import { loadMedDb } from '@/lib/meddb';
import { resolveUnitPrice } from '@/lib/pricing';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function formularyEstimate(
  lines: Array<{ matched_name: string | null; clean_name: string; qty: number }>,
  medDb: any[] | undefined
): Promise<number | null> {
  if (!medDb?.length || !lines.length) return null;
  let sum = 0;
  let any = false;
  for (const line of lines) {
    const name = line.matched_name || line.clean_name;
    const unit = resolveUnitPrice(name, medDb);
    if (unit != null) {
      sum += unit * (line.qty > 0 ? line.qty : 1);
      any = true;
    }
  }
  return any ? Math.round(sum * 100) / 100 : null;
}

export async function GET() {
  const providers = hasOcrProvider();
  return NextResponse.json({
    ok: true,
    providers,
    configured: providers.google || providers.ocr_space,
    invoice_thresholds: {
      warn_pct: Number(process.env.INVOICE_WARN_PCT || 8),
      fail_pct: Number(process.env.INVOICE_FAIL_PCT || 25),
    },
    drive_sa: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const docKind =
      body.docKind === 'invoice' || body.docKind === 'prescription'
        ? body.docKind
        : 'auto';

    let medDb;
    try {
      if (body.match !== false) {
        medDb = await loadMedDb();
      }
    } catch {
      medDb = undefined;
    }

    // Explicit validate-only endpoint body
    if (body.action === 'validate_invoice' && body.text) {
      const inv = parseInvoiceText(String(body.text));
      const validation = validateInvoiceTotal({
        invoice: inv,
        formulary_estimate_egp:
          body.formulary_estimate_egp != null
            ? Number(body.formulary_estimate_egp)
            : null,
      });
      return NextResponse.json({ ok: true, invoice: inv, validation });
    }

    if (Array.isArray(body.urls) && body.urls.length) {
      const batch = await runBatchOcr({
        urls: body.urls.map(String),
        medDb,
        docKind,
      });
      const allLines = batch.results.flatMap((r) => r.lines || []);
      const est = await formularyEstimate(allLines, medDb);
      const form_fields = ocrResultToFormFields(batch.results, {
        formulary_estimate_egp: est,
      });
      return NextResponse.json({ ok: true, ...batch, form_fields });
    }

    if (body.text && !body.imageUrl && !body.imageBase64) {
      const text = String(body.text);
      const lines = await parseOcrTextToMedLines(text, medDb);
      const invoice =
        docKind === 'invoice' || /فاتورة|invoice|إجمالي/i.test(text)
          ? parseInvoiceText(text)
          : undefined;
      const est = await formularyEstimate(lines, medDb);
      const result = {
        ok: true as const,
        provider: 'manual' as const,
        full_text: text,
        lines,
        doc_kind: (invoice ? 'invoice' : 'prescription') as const,
        invoice,
        disclaimer:
          'OCR is probabilistic. Verify every line against the original image.',
      };
      const form_fields = ocrResultToFormFields(result, {
        formulary_estimate_egp: est,
      });
      return NextResponse.json({ ...result, form_fields });
    }

    const result = await runPrescriptionOcr({
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      imageBase64: body.imageBase64 ? String(body.imageBase64) : undefined,
      mime: body.mime ? String(body.mime) : undefined,
      text: body.text ? String(body.text) : undefined,
      medDb,
      docKind,
    });

    const est = await formularyEstimate(result.lines || [], medDb);
    const form_fields = ocrResultToFormFields(result, {
      formulary_estimate_egp: est,
    });
    const status = result.ok ? 200 : 422;
    return NextResponse.json({ ...result, form_fields }, { status });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
