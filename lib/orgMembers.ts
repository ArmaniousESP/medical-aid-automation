import { query } from '@/lib/db';
import {
  ensureOrgTables,
  type OrgMemberRole,
} from '@/lib/organizations';

export async function listMembersForOrg(orgCode: string) {
  await ensureOrgTables();
  const r = await query<{
    id: string;
    email: string;
    role: string;
    display_name: string | null;
    active: boolean;
    org_code: string;
    org_name: string;
  }>(
    `SELECT m.id::text, m.email, m.role, m.display_name, m.active,
            o.code AS org_code, o.name AS org_name
     FROM org_members m
     JOIN organizations o ON o.id = m.org_id
     WHERE upper(o.code) = upper($1)
     ORDER BY m.role, m.email`,
    [orgCode]
  );
  return r.rows;
}

export async function inviteOrgMember(input: {
  org_code: string;
  email: string;
  role?: OrgMemberRole;
  display_name?: string;
  invited_by?: string;
}): Promise<{ ok: boolean; error?: string; member?: Record<string, unknown> }> {
  await ensureOrgTables();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Valid email required' };
  }
  const role: OrgMemberRole =
    input.role === 'org_viewer' || input.role === 'org_operator'
      ? input.role
      : 'org_admin';

  const org = await query<{ id: string; code: string }>(
    `SELECT id::text, code FROM organizations WHERE upper(code) = upper($1) LIMIT 1`,
    [input.org_code]
  );
  if (!org.rows[0]) return { ok: false, error: 'Organization not found' };

  const ins = await query<{ id: string; email: string; role: string }>(
    `INSERT INTO org_members (org_id, email, role, display_name, invited_by, active)
     VALUES ($1::uuid, $2, $3, $4, $5, true)
     ON CONFLICT (org_id, email) DO UPDATE SET
       role = EXCLUDED.role,
       display_name = COALESCE(EXCLUDED.display_name, org_members.display_name),
       active = true,
       invited_by = EXCLUDED.invited_by,
       updated_at = now()
     RETURNING id::text, email, role`,
    [
      org.rows[0].id,
      email,
      role,
      input.display_name?.trim() || null,
      input.invited_by || 'admin',
    ]
  );

  return {
    ok: true,
    member: {
      ...ins.rows[0],
      org_code: org.rows[0].code,
    },
  };
}

export async function setMemberActive(
  memberId: string,
  active: boolean
): Promise<{ ok: boolean }> {
  await ensureOrgTables();
  await query(
    `UPDATE org_members SET active = $2, updated_at = now() WHERE id = $1::uuid`,
    [memberId, active]
  );
  return { ok: true };
}
