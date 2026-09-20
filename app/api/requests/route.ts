import { NextRequest, NextResponse } from 'next/server';
import { listRequestStatuses, requestStatusSummary } from '@/lib/requestStatus';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/requests?period=2026-09&stage=in_review&q=اسم&summary=1
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set', code: 'missing_env' },
        { status: 503 }
      );
    }

    const sp = req.nextUrl.searchParams;
    if (sp.get('summary') === '1') {
      const summary = await requestStatusSummary(sp.get('period') || undefined);
      return NextResponse.json({ ok: true, ...summary });
    }

    const result = await listRequestStatuses({
      period: sp.get('period') || undefined,
      stage: sp.get('stage') || undefined,
      q: sp.get('q') || undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 200,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
