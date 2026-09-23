import { NextRequest, NextResponse } from 'next/server';
import {
  listFailedNotifications,
  replayFailedNotifications,
} from '@/lib/notificationReplay';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const limit = Number(req.nextUrl.searchParams.get('limit') || 30);
    const rows = await listFailedNotifications(limit);
    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const result = await replayFailedNotifications({
      limit: body.limit != null ? Number(body.limit) : 20,
      dry_run: body.dry_run === true,
      ids: Array.isArray(body.ids) ? body.ids.map(String) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
