import { NextRequest, NextResponse } from 'next/server';
import { generateRefills } from '@/lib/refills';

export const dynamic = 'force-dynamic';

/**
 * POST /api/refills/generate
 * Body: { "period": "2026-09" }
 * Optional header: x-process-secret
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PROCESS_SECRET;
    if (secret) {
      const h = req.headers.get('x-process-secret');
      if (h !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const period =
      body.period ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const result = await generateRefills(String(period));
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Generate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
