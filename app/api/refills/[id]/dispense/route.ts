import { NextRequest, NextResponse } from 'next/server';
import { dispenseCycle } from '@/lib/refills';
import { authorizeRequest } from '@/lib/auth';
import { assertRefillSafetyAck, getRefillSafetyReport } from '@/lib/refillSafety';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const acknowledge_safety = body.acknowledge_safety === true;

    try {
      await assertRefillSafetyAck(ctx.params.id, acknowledge_safety);
    } catch (e: unknown) {
      const safety = await getRefillSafetyReport(ctx.params.id);
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : 'Safety gate',
          code: 'safety_ack_required',
          safety,
        },
        { status: 409 }
      );
    }

    const detail = await dispenseCycle({
      cycleId: ctx.params.id,
      notes: body.notes ? String(body.notes) : undefined,
      actor: body.actor ? String(body.actor) : 'api',
      notify_whatsapp: body.notify_whatsapp !== false,
    });

    return NextResponse.json({ ok: true, ...detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dispense failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
