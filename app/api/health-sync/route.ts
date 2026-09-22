import { NextRequest, NextResponse } from 'next/server';
import { listHealthSyncRuns, runHealthDataSync } from '@/lib/healthSync';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** List recent sync runs */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    const runs = await listHealthSyncRuns(25);
    return NextResponse.json({ ok: true, runs });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

/** Manual trigger (UI / ops) */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const result = await runHealthDataSync({
      trigger: String(body.trigger || 'ui'),
      skipProcess: body.skip_process === true,
      skipSync: body.skip_sync === true,
      processDryRun: body.dry_run === true,
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.partial ? 207 : 500,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
