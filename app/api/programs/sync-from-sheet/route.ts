import { NextRequest, NextResponse } from 'next/server';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Manual / UI: Approved-Requests → Neon */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
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
    const message = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
