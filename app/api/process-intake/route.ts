import { NextRequest, NextResponse } from 'next/server';
import { processPlatformIntake } from '@/lib/processIntake';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Process platform intake rows (no Google Sheet required) */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const result = await processPlatformIntake(!!body.dryRun);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
