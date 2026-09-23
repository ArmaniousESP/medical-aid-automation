import { NextRequest, NextResponse } from 'next/server';
import {
  runPrescriptionOcr,
  runBatchOcr,
  hasOcrProvider,
  parseOcrTextToMedLines,
} from '@/lib/prescriptionOcr';
import { parseInvoiceText } from '@/lib/invoiceOcr';
import { loadMedDb } from '@/lib/meddb';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const providers = hasOcrProvider();
  return NextResponse.json({
    ok: true,
    providers,
    configured: providers.google || providers.ocr_space,
    hint: providers.google
      ? 'Google Vision ready'
      : providers.ocr_space
        ? 'OCR.space ready'
        : 'Set GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY',
    drive_sa: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
  });
}

/**
 * POST /api/ocr
 * { imageUrl } | { imageBase64, mime? } | { text } | { urls: string[] }
 * { docKind?: 'prescription' | 'invoice' | 'auto' }
 */
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

    // Batch multiple attachment URLs (roshetta + invoices)
    if (Array.isArray(body.urls) && body.urls.length) {
      const batch = await runBatchOcr({
        urls: body.urls.map(String),
        medDb,
        docKind,
      });
      return NextResponse.json({ ok: true, ...batch });
    }

    if (body.text && !body.imageUrl && !body.imageBase64) {
      const text = String(body.text);
      const lines = await parseOcrTextToMedLines(text, medDb);
      const invoice =
        docKind === 'invoice' || /فاتورة|invoice|إجمالي/i.test(text)
          ? parseInvoiceText(text)
          : undefined;
      return NextResponse.json({
        ok: true,
        provider: 'manual',
        full_text: text,
        lines,
        doc_kind: invoice ? 'invoice' : 'prescription',
        invoice,
        disclaimer:
          'OCR is probabilistic. Verify every line against the original image.',
      });
    }

    const result = await runPrescriptionOcr({
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      imageBase64: body.imageBase64 ? String(body.imageBase64) : undefined,
      mime: body.mime ? String(body.mime) : undefined,
      text: body.text ? String(body.text) : undefined,
      medDb,
      docKind,
    });

    const status = result.ok ? 200 : 422;
    return NextResponse.json(result, { status });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
