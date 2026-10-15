import { NextRequest, NextResponse } from 'next/server';
import { getPublicRequestStatus } from '@/lib/publicStatus';
import { rateLimit, clientKey, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/request-status?id=<uuid>&phone=&emp_id=
 * Public limited status — no full lists, no med names, masked names.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = rateLimit(`status:${clientKey(req)}`, { limit: 60, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests', code: 'rate_limited' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const id = sp.get('id') || sp.get('request_id') || '';
    const phone = sp.get('phone') || undefined;
    const emp_id = sp.get('emp_id') || undefined;

    const result = await getPublicRequestStatus({
      id,
      phone,
      emp_id,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === 'not_found' ? 404 : 400 });
    }
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
