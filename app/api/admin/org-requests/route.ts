import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import {
  approveRegistrationRequest,
  ensureOrgTables,
} from '@/lib/organizations';
import { query } from '@/lib/db';
import { jsonError } from '@/lib/errors';
import { writeAudit } from '@/lib/audit';
import { staffAccessStatus } from '@/lib/staffAccess';

export const dynamic = 'force-dynamic';

/** GET pending org registration requests */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    await ensureOrgTables();
    const res = await query(
      `SELECT id::text, org_name, org_code, contact_name, contact_email,
              contact_phone, country, employee_count_est, message, status,
              created_at::text
       FROM org_registration_requests
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({
      ok: true,
      mode: process.env.ORG_REGISTRATION_MODE || 'auto',
      count: res.rows.length,
      requests: res.rows,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

/** POST { action: 'approve'|'reject', id } */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '');
    const action = String(body.action || '');
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { ok: false, error: 'id and action=approve|reject required' },
        { status: 400 }
      );
    }

    const actor =
      staffAccessStatus(req).staff_email || body.actor || 'admin';

    if (action === 'approve') {
      const result = await approveRegistrationRequest(id, String(actor));
      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      await writeAudit({
        actor: String(actor),
        action: 'org.registration_approved',
        entity_type: 'org_registration',
        entity_id: id,
        org_code: result.org?.code,
        meta: { org_name: result.org?.name },
      });
      return NextResponse.json(result);
    }

    await ensureOrgTables();
    await query(
      `UPDATE org_registration_requests
       SET status = 'rejected', reviewed_by = $2, reviewed_at = now()
       WHERE id = $1::uuid AND status = 'pending'`,
      [id, String(actor)]
    );
    await writeAudit({
      actor: String(actor),
      action: 'org.registration_rejected',
      entity_type: 'org_registration',
      entity_id: id,
    });
    return NextResponse.json({ ok: true, status: 'rejected' });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
