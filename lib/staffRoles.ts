import { query } from '@/lib/db';
import { getAllowedStaffEmails, isEmailAllowed } from '@/lib/staffAccess';

export type StaffRoleName = 'admin' | 'operator' | 'viewer';

export type StaffRoleRow = {
  id: string;
  email: string;
  role: StaffRoleName;
  display_name: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

let ensured = false;

export async function ensureStaffRolesTable(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS staff_roles (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text NOT NULL,
      role          text NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
      display_name  text,
      active        boolean NOT NULL DEFAULT true,
      notes         text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      created_by    text
    )
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_email_lower_uidx
      ON staff_roles (lower(email))
  `);
  ensured = true;
}

export function getEnvAdminEmails(): string[] {
  const raw = process.env.OPS_ADMIN_EMAILS || '';
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function resolveStaffRole(
  email: string | null | undefined
): Promise<{
  email: string;
  role: StaffRoleName | null;
  source: 'env_admin' | 'db' | 'allowlist_operator' | 'none';
  can_manage_roles: boolean;
  can_ops: boolean;
}> {
  const e = (email || '').trim().toLowerCase();
  if (!e) {
    return {
      email: '',
      role: null,
      source: 'none',
      can_manage_roles: false,
      can_ops: false,
    };
  }

  if (getEnvAdminEmails().includes(e)) {
    return {
      email: e,
      role: 'admin',
      source: 'env_admin',
      can_manage_roles: true,
      can_ops: true,
    };
  }

  try {
    await ensureStaffRolesTable();
    const r = await query<StaffRoleRow>(
      `SELECT * FROM staff_roles WHERE lower(email) = $1 AND active = true LIMIT 1`,
      [e]
    );
    const row = r.rows[0];
    if (row) {
      const role = row.role as StaffRoleName;
      return {
        email: e,
        role,
        source: 'db',
        can_manage_roles: role === 'admin',
        can_ops: role === 'admin' || role === 'operator',
      };
    }
  } catch {
    /* */
  }

  if (isEmailAllowed(e)) {
    return {
      email: e,
      role: 'operator',
      source: 'allowlist_operator',
      can_manage_roles: false,
      can_ops: true,
    };
  }

  return {
    email: e,
    role: null,
    source: 'none',
    can_manage_roles: false,
    can_ops: false,
  };
}

export async function listStaffRoles(): Promise<StaffRoleRow[]> {
  await ensureStaffRolesTable();
  const r = await query<StaffRoleRow>(
    `SELECT * FROM staff_roles ORDER BY role, lower(email)`
  );
  return r.rows;
}

export async function upsertStaffRole(input: {
  email: string;
  role: StaffRoleName;
  display_name?: string | null;
  active?: boolean;
  notes?: string | null;
  created_by?: string | null;
}): Promise<StaffRoleRow> {
  await ensureStaffRolesTable();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Valid email required');
  }
  if (!['admin', 'operator', 'viewer'].includes(input.role)) {
    throw new Error('Invalid role');
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM staff_roles WHERE lower(email) = $1 LIMIT 1`,
    [email]
  );

  if (existing.rows[0]) {
    const r = await query<StaffRoleRow>(
      `UPDATE staff_roles SET
         role = $2,
         display_name = COALESCE($3, display_name),
         active = COALESCE($4, active),
         notes = COALESCE($5, notes),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        existing.rows[0].id,
        input.role,
        input.display_name || null,
        input.active ?? true,
        input.notes || null,
      ]
    );
    return r.rows[0];
  }

  const r = await query<StaffRoleRow>(
    `INSERT INTO staff_roles (email, role, display_name, active, notes, created_by)
     VALUES ($1, $2, $3, COALESCE($4, true), $5, $6)
     RETURNING *`,
    [
      email,
      input.role,
      input.display_name || null,
      input.active ?? true,
      input.notes || null,
      input.created_by || null,
    ]
  );
  return r.rows[0];
}

export async function deactivateStaffRole(email: string): Promise<boolean> {
  await ensureStaffRolesTable();
  const r = await query(
    `UPDATE staff_roles SET active = false, updated_at = now()
     WHERE lower(email) = lower($1)`,
    [email.trim()]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function deleteStaffRole(email: string): Promise<boolean> {
  await ensureStaffRolesTable();
  const r = await query(`DELETE FROM staff_roles WHERE lower(email) = lower($1)`, [
    email.trim(),
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function syncAllowlistAsOperators(
  actor?: string
): Promise<{ added: number }> {
  await ensureStaffRolesTable();
  const emails = getAllowedStaffEmails();
  let added = 0;
  for (const email of emails) {
    const existing = await query(
      `SELECT 1 FROM staff_roles WHERE lower(email) = $1 LIMIT 1`,
      [email]
    );
    if (existing.rows.length) continue;
    await upsertStaffRole({
      email,
      role: 'operator',
      created_by: actor || 'sync_allowlist',
      notes: 'Synced from OPS_ALLOWED_EMAILS',
    });
    added++;
  }
  return { added };
}
