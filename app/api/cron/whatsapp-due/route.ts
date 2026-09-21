import { NextRequest, NextResponse } from 'next/server';
import { notifyDueRefills } from '@/lib/whatsapp';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Scheduled: remind due refills via WhatsApp (defaults to dry_run unless WHATSAPP configured) */
export async function GET(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const period = req.nextUrl.searchParams.get('period') || undefined;
  const dry =
    req.nextUrl.searchParams.get('dry_run') === '1' ||
    process.env.WHATSAPP_DRY_RUN === '1';
  const result = await notifyDueRefills({ period, dry_run: dry, limit: 100 });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
