import { NextRequest, NextResponse } from 'next/server';
import { dispenseCycle } from '@/lib/refills';

export const dynamic = 'force-dynamic';

/**
 * POST /api/refills/[id]/dispense
 * Body: { notes?, actor? }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const detail = await dispenseCycle({
      cycleId: ctx.params.id,
      notes: body.notes ? String(body.notes) : undefined,
      actor: body.actor ? String(body.actor) : undefined,
    });
    return NextResponse.json({ ok: true, ...detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dispense failed';
    const status = message.includes('Cannot dispense') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
