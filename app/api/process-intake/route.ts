import { NextRequest, NextResponse } from 'next/server';
import { processPlatformIntake } from '@/lib/processIntake';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';
import { resolveOrgScope } from '@/lib/orgScope';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Process platform intake rows (no Google Sheet required) */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const scope = await resolveOrgScope(req);
    const result = await processPlatformIntake(!!body.dryRun, {
      org_codes: scope.all ? undefined : scope.org_codes,
    });
    return NextResponse.json({
      ...result,
      org_scope: {
        all: scope.all,
        org_codes: scope.org_codes,
        source: scope.source,
      },
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
