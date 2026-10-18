import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { ensureOrgTables } from '@/lib/organizations';
import { query } from '@/lib/db';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET — per-org activity counts for platform operators */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    await ensureOrgTables();

    const orgs = await query<{
      code: string;
      name: string;
      status: string;
      members: string;
    }>(
      `SELECT o.code, o.name, coalesce(o.status,'active') AS status,
              (SELECT count(*)::text FROM org_members m
               WHERE m.org_id = o.id AND m.active = true) AS members
       FROM organizations o
       ORDER BY o.name`
    );

    const requests = await query<{ org_code: string; n: string }>(
      `SELECT upper(coalesce(org_code,'DEFAULT')) AS org_code, count(*)::text AS n
       FROM aid_requests
       GROUP BY 1`
    ).catch(() => ({ rows: [] as { org_code: string; n: string }[] }));

    const pending = await query<{ org_code: string; n: string }>(
      `SELECT upper(coalesce(org_code,'DEFAULT')) AS org_code, count(*)::text AS n
       FROM aid_requests
       WHERE status IN ('submitted','triage')
       GROUP BY 1`
    ).catch(() => ({ rows: [] as { org_code: string; n: string }[] }));

    const reqMap = Object.fromEntries(
      requests.rows.map((r) => [r.org_code, Number(r.n)])
    );
    const pendMap = Object.fromEntries(
      pending.rows.map((r) => [r.org_code, Number(r.n)])
    );

    const stats = orgs.rows.map((o) => {
      const code = o.code.toUpperCase();
      return {
        code: o.code,
        name: o.name,
        status: o.status,
        members: Number(o.members),
        requests: reqMap[code] || 0,
        pending: pendMap[code] || 0,
      };
    });

    return NextResponse.json({ ok: true, stats });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
