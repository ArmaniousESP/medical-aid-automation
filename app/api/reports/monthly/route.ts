import { NextRequest, NextResponse } from 'next/server';
import { buildMonthlyCsv, buildMonthlyReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** GET /api/reports/monthly?period=2026-09&format=json|csv */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || defaultPeriod();
    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (format === 'csv') {
      const csv = await buildMonthlyCsv(period);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="refills-${period}.csv"`,
        },
      });
    }

    const report = await buildMonthlyReport(period);
    return NextResponse.json({ ok: true, ...report });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Report failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
