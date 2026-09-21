import { NextRequest, NextResponse } from 'next/server';
import { analyticsToCsv, getMedicalAnalytics } from '@/lib/analytics';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/analytics?period=2026-09&format=csv */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set', code: 'missing_env' },
        { status: 503 }
      );
    }

    const period =
      req.nextUrl.searchParams.get('period') || undefined;
    const format = (req.nextUrl.searchParams.get('format') || 'json').toLowerCase();

    const data = await getMedicalAnalytics(period || undefined);

    if (format === 'csv') {
      return new NextResponse(analyticsToCsv(data), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="medical-analytics-${data.period}.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
