import { NextRequest, NextResponse } from 'next/server';
import { notifySafetyQueue } from '@/lib/whatsapp';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cron-friendly: GET /api/cron/safety-whatsapp?secret=PROCESS_SECRET */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const result = await notifySafetyQueue({
      dry_run: req.nextUrl.searchParams.get('dry_run') === '1',
      force: req.nextUrl.searchParams.get('force') === '1',
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
