import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  ensureOrgTables,
  listMembershipsForEmail,
} from '@/lib/organizations';
import { staffAccessStatus } from '@/lib/staffAccess';
import { getEnvAdminEmails, resolveStaffRole } from '@/lib/staffRoles';

export type OrgScope = {
  /** Platform admin / PROCESS_SECRET — see all orgs */
  all: boolean;
  /** Allowed org codes (uppercase) when not all */
  org_codes: string[];
  /** Allowed org UUIDs for chronic_programs / employees */
  org_ids: string[];
  email: string | null;
  source: 'platform_admin' | 'process_secret' | 'org_member' | 'none';
};

/**
 * Resolve which organizations the current caller may see.
 * - OPS_ADMIN_EMAILS / staff role admin → all
 * - PROCESS_SECRET unlock without email → all (legacy shared ops)
 * - Google staff with org_members → those orgs only
 * - Google staff on OPS_ALLOWED_EMAILS only (no membership) → all (backward compatible)
 */
export async function resolveOrgScope(req: NextRequest): Promise<OrgScope> {
  await ensureOrgTables();
  const status = staffAccessStatus(req);
  const email = status.staff_email || null;

  if (email) {
    const role = await resolveStaffRole(email);
    if (role.source === 'env_admin' || role.role === 'admin') {
      return {
        all: true,
        org_codes: [],
        org_ids: [],
        email,
        source: 'platform_admin',
      };
    }
    const memberships = await listMembershipsForEmail(email);
    if (memberships.length) {
      const codes = memberships.map((m) => m.org_code.toUpperCase());
      const idsRes = await query<{ id: string }>(
        `SELECT id::text FROM organizations
         WHERE upper(code) = ANY($1::text[])`,
        [codes]
      );
      return {
        all: false,
        org_codes: codes,
        org_ids: idsRes.rows.map((r) => r.id),
        email,
        source: 'org_member',
      };
    }
    // Allowlisted operator without org membership → full access (legacy)
    if (role.can_ops) {
      return {
        all: true,
        org_codes: [],
        org_ids: [],
        email,
        source: 'platform_admin',
      };
    }
  }

  // PROCESS_SECRET cookie path has no email → treat as platform ops
  if (status.admin_cookie_ok || status.header_ok) {
    return {
      all: true,
      org_codes: [],
      org_ids: [],
      email: null,
      source: 'process_secret',
    };
  }

  return {
    all: false,
    org_codes: [],
    org_ids: [],
    email,
    source: 'none',
  };
}

/** SQL fragment helpers for aid_requests.org_code filtering */
export function aidRequestsOrgClause(
  scope: OrgScope,
  params: unknown[],
  column = 'org_code'
): string {
  if (scope.all) return 'TRUE';
  if (!scope.org_codes.length) return 'FALSE';
  params.push(scope.org_codes);
  return `(upper(coalesce(${column},'DEFAULT')) = ANY($${params.length}::text[]))`;
}

export async function resolveOrgCodeForCompany(
  company: string | null | undefined
): Promise<string> {
  await ensureOrgTables();
  const c = (company || '').trim();
  if (!c) return 'DEFAULT';
  const byCode = await query<{ code: string }>(
    `SELECT code FROM organizations
     WHERE lower(code) = lower($1) OR lower(coalesce(slug,'')) = lower($1)
        OR lower(name) = lower($1)
     LIMIT 1`,
    [c]
  );
  if (byCode.rows[0]) return byCode.rows[0].code;
  // Partial name match
  const fuzzy = await query<{ code: string }>(
    `SELECT code FROM organizations
     WHERE lower(name) LIKE lower($1)
     ORDER BY length(name) ASC
     LIMIT 1`,
    [`%${c}%`]
  );
  if (fuzzy.rows[0]) return fuzzy.rows[0].code;
  return 'DEFAULT';
}

export async function getOrgIdByCode(code: string): Promise<string | null> {
  const r = await query<{ id: string }>(
    `SELECT id::text FROM organizations WHERE lower(code) = lower($1) LIMIT 1`,
    [code]
  );
  return r.rows[0]?.id || null;
}
