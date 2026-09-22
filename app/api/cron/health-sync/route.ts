import { NextRequest, NextResponse } from 'next/server';
import { runHealthDataSync } from '@/lib/healthSync';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Automated health data sync:
 * 1) Process new form responses (sheet)
 * 2) Sync Approved-Requests → Neon chronic programs
 *
 * Auth: CRON_SECRET or PROCESS_SECRET via Bearer / x-process-secret / ?secret=
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
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const body =
      req.method === 'POST'
        ? await req.json().catch(() => ({}))
        : {};

    const result = await runHealthDataSync({
      trigger:
        String(body.trigger || sp.get('trigger') || 'cron-health-sync'),
      skipProcess:
        body.skip_process === true || sp.get('skip_process') === '1',
      skipSync: body.skip_sync === true || sp.get('skip_sync') === '1',
      processDryRun:
        body.dry_run === true || sp.get('dry_run') === '1',
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : result.partial ? 207 : 500,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
  if (!secret) return true;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (req.headers.get('x-process-secret') === secret) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}
