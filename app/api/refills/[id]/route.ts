import { NextRequest, NextResponse } from 'next/server';
import { getRefillDetail } from '@/lib/refills';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const detail = await getRefillDetail(ctx.params.id);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
