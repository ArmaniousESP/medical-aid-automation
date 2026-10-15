import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { backfillAidRequestOrgCodes } from '@/lib/orgBackfill';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** POST /api/admin/org-backfill — ops only */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit || 500);
    const result = await backfillAidRequestOrgCodes(limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
