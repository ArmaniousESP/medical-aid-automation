import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth';
import { importPharmacyCsv } from '@/lib/pharmacy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/pharmacy/import-csv
 * Body: raw CSV text (text/csv or text/plain)
 *    or multipart form field "file"
 *    or JSON { csv: string, markItemDispensed?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized', ok: false }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not set', ok: false },
        { status: 503 }
      );
    }

    const ct = req.headers.get('content-type') || '';
    let csv = '';
    let markItemDispensed = true;

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (file && typeof file === 'object' && 'text' in file) {
        csv = await (file as File).text();
      } else {
        const raw = form.get('csv');
        if (typeof raw === 'string') csv = raw;
      }
      const mark = form.get('markItemDispensed');
      if (mark === '0' || mark === 'false') markItemDispensed = false;
    } else if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      csv = String(body.csv || body.text || '');
      if (body.markItemDispensed === false) markItemDispensed = false;
    } else {
      csv = await req.text();
    }

    if (!csv.trim()) {
      return NextResponse.json(
        { error: 'Empty CSV', ok: false },
        { status: 400 }
      );
    }

    const result = await importPharmacyCsv(csv, {
      actor: 'pharmacy-csv-import',
      markItemDispensed,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import failed';
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
