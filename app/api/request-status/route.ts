import { NextRequest, NextResponse } from 'next/server';
import { getPublicRequestStatus } from '@/lib/publicStatus';

export const dynamic = 'force-dynamic';

/**
 * GET /api/request-status?id=<uuid>&phone=&emp_id=
 * Public limited status — no full lists, no med names, masked names.
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'Service unavailable' },
        { status: 503 }
      );
    }
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id') || '';
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id (request UUID) required' },
        { status: 400 }
      );
    }
    const status = await getPublicRequestStatus({
      id,
      phone: sp.get('phone') || undefined,
      emp_id: sp.get('emp_id') || undefined,
    });
    if (!status) {
      return NextResponse.json(
        { ok: false, error: 'Not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, ...status });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
