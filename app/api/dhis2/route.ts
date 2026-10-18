import { NextRequest, NextResponse } from 'next/server';
import {
  dhis2ConfigStatus,
  dhis2Ping,
  dhis2PushReady,
  buildEnrollmentTrackerBody,
  pushTrackerImport,
  type Dhis2ProgramPayload,
} from '@/lib/dhis2';
import { requireOps } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET — config + optional live ping (?ping=1) */
export async function GET(req: NextRequest) {
  const status = dhis2ConfigStatus();
  const ping = req.nextUrl.searchParams.get('ping') === '1';
  if (!ping) {
    return NextResponse.json({ ok: true, dhis2: status });
  }
  if (!status.configured) {
    return NextResponse.json({
      ok: false,
      dhis2: status,
      error: 'DHIS2 not configured',
    });
  }
  const live = await dhis2Ping();
  return NextResponse.json({
    ok: live.ok,
    dhis2: status,
    live,
  });
}

/**
 * POST — ops only
 * body: { action: 'ping' | 'dry_enrollment' | 'push_enrollment', payload?: Dhis2ProgramPayload }
 */
export async function POST(req: NextRequest) {
  const gate = await requireOps(req);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  let body: {
    action?: string;
    payload?: Dhis2ProgramPayload;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = body.action || 'ping';

  if (action === 'ping') {
    const live = await dhis2Ping();
    return NextResponse.json({ ok: live.ok, live, dhis2: dhis2ConfigStatus() });
  }

  if (action === 'dry_enrollment' || action === 'push_enrollment') {
    if (!dhis2PushReady()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DHIS2 push not ready — set BASE_URL, auth, ORG_UNIT, PROGRAM, TET',
          dhis2: dhis2ConfigStatus(),
        },
        { status: 400 }
      );
    }
    const payload: Dhis2ProgramPayload = {
      program_id: body.payload?.program_id || 'demo',
      program_code: body.payload?.program_code || 'DEMO',
      emp_name: body.payload?.emp_name || 'Demo Employee',
      emp_id: body.payload?.emp_id || '0',
      patient_name: body.payload?.patient_name || 'Demo Patient',
      phone: body.payload?.phone,
      company: body.payload?.company,
      request_id: body.payload?.request_id,
      enrolled_at: body.payload?.enrolled_at,
    };
    const trackerBody = buildEnrollmentTrackerBody(payload);
    if (action === 'dry_enrollment') {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        tracker_body: trackerBody,
        dhis2: dhis2ConfigStatus(),
      });
    }
    const r = await pushTrackerImport(trackerBody);
    return NextResponse.json({
      ok: r.ok,
      dry_run: r.dry_run,
      data: r.data,
      error: r.error,
      dhis2: dhis2ConfigStatus(),
    });
  }

  return NextResponse.json(
    { ok: false, error: 'Unknown action — use ping | dry_enrollment | push_enrollment' },
    { status: 400 }
  );
}
