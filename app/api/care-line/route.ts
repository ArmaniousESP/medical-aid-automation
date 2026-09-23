import { NextRequest, NextResponse } from 'next/server';
import {
  getReleaseCalendar,
  listCareContacts,
  logCareContact,
  markDropout,
  DROPOUT_REASONS,
} from '@/lib/careLine';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    const sp = req.nextUrl.searchParams;

    if (sp.get('calendar') === '1') {
      const cal = await getReleaseCalendar({
        period: sp.get('period') || undefined,
        limit: 200,
      });
      return NextResponse.json({ ok: true, ...cal });
    }

    if (sp.get('dropout_reasons') === '1') {
      return NextResponse.json({ ok: true, reasons: DROPOUT_REASONS });
    }

    const programId = sp.get('program_id');
    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'program_id or calendar=1 required' },
        { status: 400 }
      );
    }
    const contacts = await listCareContacts(programId);
    return NextResponse.json({ ok: true, contacts });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
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
    const action = String(body.action || 'log');

    if (action === 'dropout') {
      if (!body.program_id || !body.reason_code) {
        return NextResponse.json(
          { ok: false, error: 'program_id and reason_code required' },
          { status: 400 }
        );
      }
      const result = await markDropout({
        program_id: String(body.program_id),
        reason_code: String(body.reason_code),
        notes: body.notes ? String(body.notes) : undefined,
        actor: body.actor ? String(body.actor) : undefined,
      });
      // result may already include ok — spread first so we do not double-specify
      return NextResponse.json({ ...result, ok: true });
    }

    if (!body.program_id) {
      return NextResponse.json(
        { ok: false, error: 'program_id required' },
        { status: 400 }
      );
    }

    const result = await logCareContact({
      program_id: String(body.program_id),
      channel: body.channel ? String(body.channel) : 'phone',
      direction: body.direction ? String(body.direction) : 'outbound',
      outcome: body.outcome ? String(body.outcome) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      actor: body.actor ? String(body.actor) : 'care-line-ui',
      send_whatsapp: body.send_whatsapp === true,
      whatsapp_dry_run: body.whatsapp_dry_run === true,
    });

    return NextResponse.json({ ...result, ok: true });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
