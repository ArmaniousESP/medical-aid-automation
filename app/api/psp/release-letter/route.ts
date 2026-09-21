import { NextRequest, NextResponse } from 'next/server';
import { issueReleaseLetter, listReleaseLetters } from '@/lib/releaseLetter';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const programId = req.nextUrl.searchParams.get('program_id');
    if (!programId) {
      return NextResponse.json({ ok: false, error: 'program_id required' }, { status: 400 });
    }
    const letters = await listReleaseLetters(programId);
    return NextResponse.json({ ok: true, letters });
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
    if (!body.program_id) {
      return NextResponse.json({ ok: false, error: 'program_id required' }, { status: 400 });
    }
    const letter = await issueReleaseLetter({
      program_id: String(body.program_id),
      cycle_id: body.cycle_id ? String(body.cycle_id) : undefined,
      period: body.period ? String(body.period) : undefined,
      pharmacy_note: body.pharmacy_note ? String(body.pharmacy_note) : undefined,
    });
    return NextResponse.json({ ok: true, ...letter });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
