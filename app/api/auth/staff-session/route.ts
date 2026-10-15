import { NextRequest, NextResponse } from 'next/server';
import { getNeonAuth, neonAuthConfigured } from '@/lib/auth/server';
import {
  STAFF_COOKIE,
  isEmailAllowed,
  signStaffToken,
  staffAccessStatus,
} from '@/lib/staffAccess';
import { sessionCookieOptions, clearCookieOptions } from '@/lib/cookies';
import { resolveStaffRole } from '@/lib/staffRoles';
import { listMembershipsForEmail } from '@/lib/organizations';
import { resolveOrgScope } from '@/lib/orgScope';

export const dynamic = 'force-dynamic';

/**
 * GET — current staff session status
 * POST — after Google sign-in, mint maa_ops_staff if allowlisted or has DB role
 * DELETE — clear staff cookie
 */
export async function GET(req: NextRequest) {
  const status = staffAccessStatus(req);
  let roleInfo = null;
  if (status.staff_email) {
    try {
      roleInfo = await resolveStaffRole(status.staff_email);
    } catch {
      roleInfo = null;
    }
  }

  let memberships: unknown[] = [];
  let org_scope: unknown = null;
  if (status.staff_email) {
    try {
      memberships = await listMembershipsForEmail(status.staff_email);
    } catch {
      memberships = [];
    }
  }
  try {
    org_scope = await resolveOrgScope(req);
  } catch {
    org_scope = null;
  }

  return NextResponse.json({
    ok: true,
    neon_configured: neonAuthConfigured(),
    ...status,
    role: roleInfo?.role ?? null,
    role_source: roleInfo?.source ?? null,
    can_manage_roles: roleInfo?.can_manage_roles ?? false,
    can_ops: roleInfo?.can_ops ?? status.staff_ok,
    org_memberships: memberships,
    org_scope,
  });
}

export async function POST(req: NextRequest) {
  if (!neonAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Neon Auth not configured' },
      { status: 503 }
    );
  }

  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: 'Neon Auth init failed' },
      { status: 503 }
    );
  }

  const { data: session, error } = await auth.getSession();
  if (error || !session?.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No Neon Auth session — sign in with Google first',
        detail: error?.message,
      },
      { status: 401 }
    );
  }

  const email = String(session.user.email);
  const roleInfo = await resolveStaffRole(email);
  const memberships = await listMembershipsForEmail(email).catch(() => []);
  const allowed =
    isEmailAllowed(email) ||
    roleInfo.can_ops ||
    roleInfo.source === 'env_admin' ||
    memberships.length > 0;

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Email ${email} is not allowlisted, has no staff role, and no org membership`,
        code: 'email_not_allowed',
      },
      { status: 403 }
    );
  }

  const token = signStaffToken(email);
  const res = NextResponse.json({
    ok: true,
    email,
    name: session.user.name || null,
    staff_cookie: STAFF_COOKIE,
    role: roleInfo.role,
    role_source: roleInfo.source,
    can_manage_roles: roleInfo.can_manage_roles,
    org_memberships: memberships,
  });
  res.cookies.set(STAFF_COOKIE, token, sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, cleared: true });
  res.cookies.set(STAFF_COOKIE, '', clearCookieOptions());
  return res;
}
