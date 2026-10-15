import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { inviteOrgMember, listMembersForOrg, setMemberActive } from '@/lib/orgMembers';
import { jsonError } from '@/lib/errors';
import { writeAudit } from '@/lib/audit';
import { staffAccessStatus } from '@/lib/staffAccess';

export const dynamic = 'force-dynamic';

/** GET ?org_code=ARMANIOUS */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    const org_code = req.nextUrl.searchParams.get('org_code')?.trim();
    if (!org_code) {
      return NextResponse.json(
        { ok: false, error: 'org_code required' },
        { status: 400 }
      );
    }
    const members = await listMembersForOrg(org_code);
    return NextResponse.json({ ok: true, org_code, members });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

/** POST invite { org_code, email, role?, display_name? } or { action: 'deactivate', id } */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    const body = await req.json().catch(() => ({}));
    const actor = staffAccessStatus(req).staff_email || body.actor || 'admin';

    if (body.action === 'deactivate' || body.action === 'activate') {
      const id = String(body.id || '');
      if (!id) {
        return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
      }
      await setMemberActive(id, body.action === 'activate');
      await writeAudit({
        actor: String(actor),
        action:
          body.action === 'activate'
            ? 'org.member_activated'
            : 'org.member_deactivated',
        entity_type: 'org_member',
        entity_id: id,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await inviteOrgMember({
      org_code: String(body.org_code || ''),
      email: String(body.email || ''),
      role: body.role,
      display_name: body.display_name,
      invited_by: String(actor),
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    await writeAudit({
      actor: String(actor),
      action: 'org.member_invited',
      entity_type: 'org_member',
      entity_id: result.member?.id as string | undefined,
      org_code: String(body.org_code || '').toUpperCase(),
      meta: { email: body.email, role: body.role || 'org_admin' },
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
