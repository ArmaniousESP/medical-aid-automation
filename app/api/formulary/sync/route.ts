import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { syncFormularyFromMsh, formularyCount } from '@/lib/formularySync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/formulary/sync — load/update formulary_meds from MSH (ops only)
 * GET  /api/formulary/sync — count rows
 */
export async function GET(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }
  const total = await formularyCount();
  return NextResponse.json({ ok: true, total });
}

export async function POST(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }

  const body = await req.json().catch(() => ({}));
  const queries = Array.isArray(body.queries)
    ? body.queries.map((q: unknown) => String(q)).filter(Boolean)
    : undefined;

  try {
    const result = await syncFormularyFromMsh({
      queries,
      limitPerQuery: body.limitPerQuery ? Number(body.limitPerQuery) : 5,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'sync failed',
      },
      { status: 500 }
    );
  }
}
