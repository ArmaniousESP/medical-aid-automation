import { NextRequest, NextResponse } from 'next/server';
import {
  runPrescriptionOcr,
  hasOcrProvider,
  parseOcrTextToMedLines,
} from '@/lib/prescriptionOcr';
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
  });
}

/**
 * POST /api/ocr
 * { imageUrl } | { imageBase64, mime? } | { text }
 * Optional: match against med DB (default true)
 */
export async function POST(req: NextRequest) {
  try {
    // Allow unlocked session or secret; public read of status is GET only
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let medDb;
    try {
      if (body.match !== false) {
        medDb = await loadMedDb();
      }
    } catch {
      medDb = undefined;
    }

    if (body.text && !body.imageUrl && !body.imageBase64) {
      const lines = await parseOcrTextToMedLines(String(body.text), medDb);
      return NextResponse.json({
        ok: true,
        provider: 'manual',
        full_text: String(body.text),
        lines,
        disclaimer:
          'OCR is probabilistic. Verify every line against the original roshetta.',
      });
    }

    const result = await runPrescriptionOcr({
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      imageBase64: body.imageBase64 ? String(body.imageBase64) : undefined,
      mime: body.mime ? String(body.mime) : undefined,
      text: body.text ? String(body.text) : undefined,
      medDb,
    });

    const status = result.ok ? 200 : 422;
    return NextResponse.json(result, { status });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
