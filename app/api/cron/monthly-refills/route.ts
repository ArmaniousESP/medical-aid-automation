import { NextRequest, NextResponse } from 'next/server';
import { generateRefills } from '@/lib/refills';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Day-1 monthly generate for Vercel Cron */
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
    const result = await generateRefills(period);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Generate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
