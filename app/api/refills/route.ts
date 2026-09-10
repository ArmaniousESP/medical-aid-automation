import { NextRequest, NextResponse } from 'next/server';
import { listRefills } from '@/lib/refills';

export const dynamic = 'force-dynamic';

/** GET /api/refills?status=in_review&period=2026-09 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const period = searchParams.get('period') || undefined;
    const limit = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : 50;

    const rows = await listRefills({ status, period, limit });
    return NextResponse.json({ ok: true, count: rows.length, refills: rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
