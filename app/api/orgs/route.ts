import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth';
import {
  ensureOrgTables,
  listActiveOrganizations,
  listMembershipsForEmail,
} from '@/lib/organizations';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET — list active orgs (public names) or memberships when ?email= */
export async function GET(req: NextRequest) {
  try {
    await ensureOrgTables();
    const email = req.nextUrl.searchParams.get('email');
    if (email) {
      const memberships = await listMembershipsForEmail(email);
      return NextResponse.json({ ok: true, memberships });
    }
    const orgs = await listActiveOrganizations();
    return NextResponse.json({ ok: true, organizations: orgs });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}

/** GET pending registrations — ops only via separate path handled in admin */
export async function POST(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await ensureOrgTables();
    const body = await req.json();
    if (body.action === 'list_pending') {
      const r = await query(
        `SELECT id::text, org_name, org_code, contact_name, contact_email,
                contact_phone, country, employee_count_est, message, status,
                created_at::text
         FROM org_registration_requests
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 100`
      );
      return NextResponse.json({ ok: true, requests: r.rows });
    }
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
