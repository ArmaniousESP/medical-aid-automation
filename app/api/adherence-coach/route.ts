import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth';
import { runAdherenceCoach } from '@/lib/adherenceCoach';
import { featureFlagsStatus } from '@/lib/featureFlags';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const programId = req.nextUrl.searchParams.get('program_id');
    if (!programId) {
      return NextResponse.json(
        { ok: false, error: 'program_id required', flags: featureFlagsStatus() },
        { status: 400 }
      );
    }
    const result = await runAdherenceCoach(programId);
    return NextResponse.json({ ...result, flags: featureFlagsStatus() });
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
    const programId = String(body.program_id || '');
    if (!programId) {
      return NextResponse.json({ ok: false, error: 'program_id required' }, { status: 400 });
    }
    const result = await runAdherenceCoach(programId);
    return NextResponse.json({ ...result, flags: featureFlagsStatus() });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
