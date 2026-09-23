import { NextRequest, NextResponse } from 'next/server';
import { notifySafetyQueue } from '@/lib/whatsapp';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/notifications/safety-alert
 * Body: { dry_run?: boolean, force?: boolean, limit?: number }
 * Sends WhatsApp to SAFETY_WHATSAPP_TO when safety queue has flags.
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const result = await notifySafetyQueue({
      dry_run: body.dry_run === true,
      force: body.force === true,
      limit: body.limit != null ? Number(body.limit) : 40,
      app_base_url: body.app_base_url ? String(body.app_base_url) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  // Allow cron with secret as query
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const dry = req.nextUrl.searchParams.get('dry_run') === '1';
    const force = req.nextUrl.searchParams.get('force') === '1';
    const result = await notifySafetyQueue({ dry_run: dry, force });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
