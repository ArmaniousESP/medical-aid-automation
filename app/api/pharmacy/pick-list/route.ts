import { NextRequest, NextResponse } from 'next/server';
import {
  buildPharmacyPickList,
  pharmacyPickListCsv,
} from '@/lib/pharmacy';

export const dynamic = 'force-dynamic';

/** GET /api/pharmacy/pick-list?period=2026-09&status=dispensed&format=csv */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not set', ok: false },
        { status: 503 }
      );
    }

    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') || undefined;
    const status = searchParams.get('status') || undefined;
    const includePending = searchParams.get('includePending') === 'true';
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const lines = await buildPharmacyPickList({
      period,
      status,
      includePending,
    });

    if (format === 'csv') {
      const csv = pharmacyPickListCsv(lines);
      const label = period || 'all';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="pharmacy-picklist-${label}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      count: lines.length,
      lines,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Pick list failed';
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
