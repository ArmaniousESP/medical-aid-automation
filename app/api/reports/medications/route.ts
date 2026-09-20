import { NextRequest, NextResponse } from 'next/server';
import { buildMedicationsCsv, buildMedicationsReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

/** GET /api/reports/medications?format=json|csv */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not set', ok: false },
        { status: 503 }
      );
    }

    const format = (req.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    if (format === 'csv') {
      const csv = await buildMedicationsCsv();
      const day = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="medications-${day}.csv"`,
        },
      });
    }

    const report = await buildMedicationsReport();
    return NextResponse.json({ ok: true, ...report });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Medications report failed';
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
