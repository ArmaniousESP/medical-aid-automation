import { NextRequest, NextResponse } from 'next/server';
import {
  notifyDueRefills,
  sendWhatsApp,
  whatsappConfigStatus,
  type WaTemplateKey,
} from '@/lib/whatsapp';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET status | POST send | batch due */
export async function GET() {
  return NextResponse.json({ ok: true, ...whatsappConfigStatus() });
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'send');
    const dry_run = body.dry_run === true || body.dryRun === true;

    if (action === 'notify_due' || action === 'batch_due') {
      const result = await notifyDueRefills({
        period: body.period ? String(body.period) : undefined,
        dry_run,
        limit: body.limit ? Number(body.limit) : 50,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (!body.to && !body.phone) {
      return NextResponse.json(
        { ok: false, error: 'to/phone required (or action=notify_due)' },
        { status: 400 }
      );
    }

    const result = await sendWhatsApp({
      to: String(body.to || body.phone),
      template: (body.template || 'custom') as WaTemplateKey,
      vars: body.vars || { message: body.message || '' },
      program_id: body.program_id ? String(body.program_id) : undefined,
      dry_run,
    });

    return NextResponse.json({ ok: result.ok, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
