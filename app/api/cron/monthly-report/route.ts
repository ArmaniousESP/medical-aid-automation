import { NextRequest, NextResponse } from 'next/server';
import { buildMedicationsReport, buildMonthlyReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Scheduled snapshot: monthly refill summary + active medications formulary.
 * Vercel Cron: day 2 06:00 UTC (after day-1 generate).
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      const h = req.headers.get('x-process-secret');
      const q = req.nextUrl.searchParams.get('secret');
      const ok =
        auth === `Bearer ${cronSecret}` || h === cronSecret || q === cronSecret;
      if (!ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 503 }
      );
    }

    const period =
      req.nextUrl.searchParams.get('period') || currentPeriod();

    const [monthly, medications] = await Promise.all([
      buildMonthlyReport(period),
      buildMedicationsReport(),
    ]);

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      period,
      monthly: {
        summary: monthly.summary,
        top_meds: monthly.top_meds,
        cycles: monthly.cycles.length,
      },
      medications: {
        summary: medications.summary,
        by_formulary: medications.by_formulary,
        catalog_size: medications.catalog.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Report cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
