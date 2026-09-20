import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';
import { authorizeRequest } from '@/lib/auth';
import { jsonError, softStep } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);

    const step = await softStep('process', () => processNewResponses(dryRun));
    if (!step.ok) {
      return NextResponse.json(
        { ok: false, error: step.error, code: step.code, soft: step.soft },
        { status: step.soft ? 503 : 500 }
      );
    }

    return NextResponse.json({ ok: true, ...step.data });
  } catch (err: unknown) {
    console.error(err);
    const { body, status } = jsonError(err);
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }
    const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';
    const step = await softStep('process', () => processNewResponses(dryRun));
    if (!step.ok) {
      return NextResponse.json(
        { ok: false, error: step.error, code: step.code, soft: step.soft },
        { status: step.soft ? 503 : 500 }
      );
    }
    return NextResponse.json({ ok: true, ...step.data });
  } catch (err: unknown) {
    console.error(err);
    const { body, status } = jsonError(err);
    return NextResponse.json(body, { status });
  }
}
