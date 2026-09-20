import { NextRequest, NextResponse } from 'next/server';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled: Approved-Requests → Neon chronic programs.
 * Does not re-process form responses (use /api/cron/daily for that).
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  try {
    if (!authorize(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }

    const hasGoogle =
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      !!process.env.GOOGLE_PRIVATE_KEY &&
      !!process.env.GOOGLE_SHEET_ID;

    if (!hasGoogle) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID required',
        },
        { status: 503 }
      );
    }

    const started = Date.now();
    const result = await syncApprovedToPrograms();
    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - started,
      ...result,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sheet sync failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get('x-process-secret') === secret) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}
