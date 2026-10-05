import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { verifyStaffToken, readStaffCookie } from '@/lib/staffAccess';
import {
  listStaffRoles,
  upsertStaffRole,
  deleteStaffRole,
  deactivateStaffRole,
  resolveStaffRole,
  syncAllowlistAsOperators,
  type StaffRoleName,
} from '@/lib/staffRoles';

export const dynamic = 'force-dynamic';

async function actorEmail(req: NextRequest): Promise<string | null> {
  const v = verifyStaffToken(readStaffCookie(req));
  return v.ok ? v.email || null : null;
}

async function requireRoleAdmin(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return { error: unauthorizedResponse() };
  }
  const email = await actorEmail(req);
  // PROCESS_SECRET unlock without Google: allow role mgmt if OPS_ADMIN_EMAILS empty
  // and secret is valid — treat as system admin
  if (!email) {
    const secretsOk = authorizeRequest(req);
    if (secretsOk && !readStaffCookie(req)) {
      return { email: 'secret-admin', system: true as const };
    }
    return {
      error: {
        body: { ok: false, error: 'Sign in with Google staff account first' },
        status: 401,
      },
    };
  }
  const resolved = await resolveStaffRole(email);
  if (!resolved.can_manage_roles) {
    return {
      error: {
        body: {
          ok: false,
          error: 'Admin role required to manage staff',
          your_role: resolved.role,
        },
        status: 403,
      },
    };
  }
  return { email, system: false as const };
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireRoleAdmin(req);
    if ('error' in gate && gate.error) {
      return NextResponse.json(gate.error.body, { status: gate.error.status });
    }
    const rows = await listStaffRoles();
    const me = gate.email
      ? await resolveStaffRole(gate.email === 'secret-admin' ? null : gate.email)
      : null;
    return NextResponse.json({
      ok: true,
      roles: rows,
      actor: gate.email,
      actor_role: me?.role ?? (gate.system ? 'admin' : null),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireRoleAdmin(req);
    if ('error' in gate && gate.error) {
      return NextResponse.json(gate.error.body, { status: gate.error.status });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'upsert');

    if (action === 'sync_allowlist') {
      const result = await syncAllowlistAsOperators(String(gate.email));
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'deactivate') {
      const ok = await deactivateStaffRole(String(body.email || ''));
      return NextResponse.json({ ok, email: body.email });
    }

    if (action === 'delete') {
      const ok = await deleteStaffRole(String(body.email || ''));
      return NextResponse.json({ ok, email: body.email });
    }

    const role = String(body.role || 'operator') as StaffRoleName;
    const row = await upsertStaffRole({
      email: String(body.email || ''),
      role,
      display_name: body.display_name ? String(body.display_name) : null,
      active: body.active !== false,
      notes: body.notes ? String(body.notes) : null,
      created_by: String(gate.email),
    });
    return NextResponse.json({ ok: true, role: row });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed' },
      { status: 400 }
    );
  }
}
