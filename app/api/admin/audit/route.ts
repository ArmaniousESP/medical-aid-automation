import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { ensureAuditTable } from '@/lib/audit';
import { query } from '@/lib/db';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/admin/audit?limit=50&action=&org= */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    await ensureAuditTable();
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Number(sp.get('limit') || 50), 200);
    const action = sp.get('action')?.trim();
    const org = sp.get('org')?.trim();
    const params: unknown[] = [];
    const where = ['1=1'];
    if (action) {
      params.push(`%${action}%`);
      where.push(`action ILIKE $${params.length}`);
    }
    if (org) {
      params.push(org.toUpperCase());
      where.push(`upper(coalesce(org_code,'')) = $${params.length}`);
    }
    params.push(limit);
    const res = await query(
      `SELECT id::text, at::text, actor, action, entity_type, entity_id, org_code, meta
       FROM audit_events
       WHERE ${where.join(' AND ')}
       ORDER BY at DESC
       LIMIT $${params.length}`,
      params
    );
    return NextResponse.json({ ok: true, count: res.rows.length, events: res.rows });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
