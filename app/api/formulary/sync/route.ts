import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import {
  syncFormularyFromMsh,
  syncFormularyFromPrograms,
  formularyCount,
} from '@/lib/formularySync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET — count */
export async function GET(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }
  const total = await formularyCount();
  return NextResponse.json({ ok: true, total });
}

/**
 * POST body:
 *   { source: 'programs' | 'msh' | 'all' }  default all
 *   { queries?: string[] } for MSH
 */
export async function POST(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }

  const body = await req.json().catch(() => ({}));
  const source = String(body.source || 'all');

  try {
    if (source === 'programs') {
      const fromPrograms = await syncFormularyFromPrograms();
      const total = await formularyCount();
      return NextResponse.json({
        ok: true,
        source: 'programs',
        ...fromPrograms,
        total,
      });
    }

    const queries = Array.isArray(body.queries)
      ? body.queries.map((q: unknown) => String(q)).filter(Boolean)
      : undefined;

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
