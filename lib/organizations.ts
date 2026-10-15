import { query } from '@/lib/db';

export type OrgStatus = 'active' | 'pending' | 'suspended';
export type OrgMemberRole = 'org_admin' | 'org_operator' | 'org_viewer';

export type Organization = {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  default_currency: string;
  monthly_cap_egp: number | null;
  created_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  email: string;
  role: OrgMemberRole;
  display_name: string | null;
  active: boolean;
};

let ensured = false;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'org';
}

function codeify(input: string): string {
  const base = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return base || 'ORG';
}

export async function ensureOrgTables(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      default_currency TEXT NOT NULL DEFAULT 'EGP',
      monthly_cap_egp NUMERIC(12,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT`);
  await query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`
  );
  await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_name TEXT`);
  await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email TEXT`);
  await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_phone TEXT`);
  await query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'EG'`
  );
  await query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notes TEXT`);
  await query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb`
  );
  await query(
    `UPDATE organizations SET slug = lower(code) WHERE slug IS NULL OR slug = ''`
  );
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_uidx ON organizations (lower(slug))`
  );

  await query(`
    CREATE TABLE IF NOT EXISTS org_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('org_admin', 'org_operator', 'org_viewer')),
      display_name TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      invited_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (org_id, email)
    )`);
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS org_members_email_org_uidx ON org_members (lower(email), org_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS org_members_email_idx ON org_members (lower(email))`
  );

  await query(`
    CREATE TABLE IF NOT EXISTS org_registration_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_name TEXT NOT NULL,
      org_code TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      country TEXT DEFAULT 'EG',
      employee_count_est INT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      org_id UUID REFERENCES organizations(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  await query(
    `INSERT INTO organizations (code, name, slug, status, contact_name)
     SELECT 'DEFAULT', 'Platform default (ESP / Armanious)', 'default', 'active', 'Platform'
     WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'DEFAULT')`
  );

  ensured = true;
}

export async function listActiveOrganizations(): Promise<
  { code: string; name: string; slug: string }[]
> {
  await ensureOrgTables();
  const r = await query<{ code: string; name: string; slug: string }>(
    `SELECT code, name, coalesce(slug, lower(code)) AS slug
     FROM organizations
     WHERE coalesce(status, 'active') = 'active'
     ORDER BY name`
  );
  return r.rows;
}

export async function getOrganizationByCode(
  code: string
): Promise<Organization | null> {
  await ensureOrgTables();
  const r = await query<Organization>(
    `SELECT id::text, code, name, coalesce(slug, lower(code)) AS slug,
            coalesce(status, 'active') AS status,
            contact_name, contact_email, contact_phone, country,
            default_currency, monthly_cap_egp::float8 AS monthly_cap_egp,
            created_at::text
     FROM organizations WHERE lower(code) = lower($1) LIMIT 1`,
    [code.trim()]
  );
  return r.rows[0] || null;
}

export type RegisterOrgInput = {
  org_name: string;
  org_code?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  country?: string;
  employee_count_est?: number;
  message?: string;
  /** When true (default), create org as active immediately */
  auto_activate?: boolean;
};

export type RegisterOrgResult =
  | {
      ok: true;
      status: 'active' | 'pending';
      org?: Organization;
      request_id?: string;
      message: string;
    }
  | { ok: false; error: string };

/**
 * Public org onboarding.
 * auto_activate=true (default): create organization + first org_admin member.
 * auto_activate=false: store pending request for platform admin review.
 */
export async function registerOrganization(
  input: RegisterOrgInput
): Promise<RegisterOrgResult> {
  await ensureOrgTables();

  const org_name = input.org_name.trim();
  const contact_name = input.contact_name.trim();
  const contact_email = input.contact_email.trim().toLowerCase();
  if (!org_name || !contact_name || !contact_email.includes('@')) {
    return {
      ok: false,
      error: 'Organization name, contact name, and a valid email are required',
    };
  }

  let code = codeify(input.org_code || org_name);
  let slug = slugify(input.org_code || org_name);

  // Unique code/slug
  for (let i = 0; i < 5; i++) {
    const exists = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM organizations
       WHERE lower(code) = lower($1) OR lower(coalesce(slug,'')) = lower($2)`,
      [code, slug]
    );
    if (Number(exists.rows[0]?.n || 0) === 0) break;
    const suffix = String(Math.floor(Math.random() * 900) + 100);
    code = codeify(`${code}_${suffix}`);
    slug = slugify(`${slug}-${suffix}`);
  }

  const auto =
    input.auto_activate !== false &&
    process.env.ORG_REGISTRATION_MODE !== 'approval';

  if (!auto) {
    const req = await query<{ id: string }>(
      `INSERT INTO org_registration_requests (
         org_name, org_code, contact_name, contact_email, contact_phone,
         country, employee_count_est, message, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING id::text`,
      [
        org_name,
        code,
        contact_name,
        contact_email,
        input.contact_phone?.trim() || null,
        input.country?.trim() || 'EG',
        input.employee_count_est ?? null,
        input.message?.trim() || null,
      ]
    );
    return {
      ok: true,
      status: 'pending',
      request_id: req.rows[0]?.id,
      message:
        'Registration received. Platform admin will review and activate your organization.',
    };
  }

  const ins = await query<{ id: string }>(
    `INSERT INTO organizations (
       code, name, slug, status, contact_name, contact_email, contact_phone, country
     ) VALUES ($1,$2,$3,'active',$4,$5,$6,$7)
     RETURNING id::text`,
    [
      code,
      org_name,
      slug,
      contact_name,
      contact_email,
      input.contact_phone?.trim() || null,
      input.country?.trim() || 'EG',
    ]
  );
  const orgId = ins.rows[0]?.id;
  if (!orgId) return { ok: false, error: 'Could not create organization' };

  await query(
    `INSERT INTO org_members (org_id, email, role, display_name, invited_by)
     VALUES ($1::uuid, $2, 'org_admin', $3, 'self-register')
     ON CONFLICT (org_id, email) DO UPDATE SET role = 'org_admin', active = true`,
    [orgId, contact_email, contact_name]
  );

  const org = await getOrganizationByCode(code);
  return {
    ok: true,
    status: 'active',
    org: org || undefined,
    message:
      'Organization created. Sign in with Google using this contact email (after platform allowlists it) or use PROCESS_SECRET for ops.',
  };
}

export async function listMembershipsForEmail(
  email: string
): Promise<(OrgMember & { org_code: string; org_name: string })[]> {
  await ensureOrgTables();
  const e = email.trim().toLowerCase();
  if (!e) return [];
  const r = await query<OrgMember & { org_code: string; org_name: string }>(
    `SELECT m.id::text, m.org_id::text, m.email, m.role, m.display_name, m.active,
            o.code AS org_code, o.name AS org_name
     FROM org_members m
     JOIN organizations o ON o.id = m.org_id
     WHERE lower(m.email) = $1 AND m.active = true
       AND coalesce(o.status, 'active') = 'active'
     ORDER BY o.name`,
    [e]
  );
  return r.rows;
}

export async function approveRegistrationRequest(
  requestId: string,
  reviewedBy: string
): Promise<RegisterOrgResult> {
  await ensureOrgTables();
  const r = await query<{
    id: string;
    org_name: string;
    org_code: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
    country: string | null;
    status: string;
  }>(
    `SELECT id::text, org_name, org_code, contact_name, contact_email,
            contact_phone, country, status
     FROM org_registration_requests WHERE id = $1::uuid`,
    [requestId]
  );
  const row = r.rows[0];
  if (!row) return { ok: false, error: 'Request not found' };
  if (row.status !== 'pending')
    return { ok: false, error: `Request already ${row.status}` };

  const created = await registerOrganization({
    org_name: row.org_name,
    org_code: row.org_code,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone || undefined,
    country: row.country || undefined,
    auto_activate: true,
  });
  if (!created.ok) return created;

  await query(
    `UPDATE org_registration_requests
     SET status = 'approved', reviewed_by = $2, reviewed_at = now(),
         org_id = $3::uuid
     WHERE id = $1::uuid`,
    [requestId, reviewedBy, created.org?.id || null]
  );
  return created;
}
