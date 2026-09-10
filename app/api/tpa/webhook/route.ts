import { NextRequest, NextResponse } from 'next/server';
import type { ChronicRefillStatusEvent } from '@/lib/tpa/chronic';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tpa/webhook
 * Receives chronic refill status / dispense events from eTPA partners.
 * Protect with TPA_WEBHOOK_SECRET header when configured.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret');
    if (
      process.env.TPA_WEBHOOK_SECRET &&
      secret !== process.env.TPA_WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as ChronicRefillStatusEvent;

    if (!body?.program_id || !body?.refill_period || !body?.status) {
      return NextResponse.json(
        {
          error:
            'Invalid payload: program_id, refill_period, and status are required',
        },
        { status: 400 }
      );
    }

    // Placeholder: wire to Google Sheets / DB update of claim lines
    // Fields to persist: tpa_auth_id, per-item status, approved amounts, dispensed
    console.log('[tpa/webhook]', {
      event_type: body.event_type,
      program_id: body.program_id,
      period: body.refill_period,
      status: body.status,
      auth: body.tpa_auth_id,
      items: body.items?.length ?? 0,
    });

    return NextResponse.json({
      ok: true,
      received: {
        program_id: body.program_id,
        refill_period: body.refill_period,
        status: body.status,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Webhook failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'tpa-webhook',
    status: 'ready',
    accepts: ['chronic_refill.status', 'chronic_refill.dispensed'],
  });
}
