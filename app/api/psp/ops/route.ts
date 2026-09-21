import { NextRequest, NextResponse } from 'next/server';
import {
  getPmsDashboard,
  listAdherencePlans,
  listAdverseEvents,
  reportAdverseEvent,
  upsertAdherencePlan,
} from '@/lib/pspOps';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 503 });
    }
    const sp = req.nextUrl.searchParams;
    if (sp.get('dashboard') === '1') {
      return NextResponse.json({ ok: true, ...(await getPmsDashboard()) });
    }
    if (sp.get('adverse') === '1') {
      const rows = await listAdverseEvents({
        program_id: sp.get('program_id') || undefined,
        open_only: sp.get('open') === '1',
      });
      return NextResponse.json({ ok: true, events: rows });
    }
    const programId = sp.get('program_id');
    if (programId) {
      const plans = await listAdherencePlans(programId);
      return NextResponse.json({ ok: true, plans });
    }
    return NextResponse.json({ ok: true, ...(await getPmsDashboard()) });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'adverse_event');

    if (action === 'adherence_plan') {
      if (!body.program_id || !body.risk_band) {
        return NextResponse.json(
          { ok: false, error: 'program_id and risk_band required' },
          { status: 400 }
        );
      }
      const result = await upsertAdherencePlan({
        program_id: String(body.program_id),
        assessment_id: body.assessment_id ? String(body.assessment_id) : undefined,
        risk_band: String(body.risk_band),
        interventions: Array.isArray(body.interventions)
          ? body.interventions.map(String)
          : [],
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'adverse_event' || action === 'ae') {
      if (!body.program_id || !body.description) {
        return NextResponse.json(
          { ok: false, error: 'program_id and description required' },
          { status: 400 }
        );
      }
      const result = await reportAdverseEvent({
        program_id: String(body.program_id),
        description: String(body.description),
        severity: body.severity ? String(body.severity) : 'mild',
        med_name: body.med_name ? String(body.med_name) : undefined,
        action_taken: body.action_taken ? String(body.action_taken) : undefined,
        reporter: body.reporter ? String(body.reporter) : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
