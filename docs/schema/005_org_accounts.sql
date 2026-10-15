-- Multi-tenant organization accounts
-- Other companies can register and run their own chronic-aid workspace on this platform.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'EG',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE organizations SET slug = lower(code) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_uidx
  ON organizations (lower(slug));

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
);

CREATE UNIQUE INDEX IF NOT EXISTS org_members_email_org_uidx
  ON org_members (lower(email), org_id);

CREATE INDEX IF NOT EXISTS org_members_email_idx
  ON org_members (lower(email));

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
);

-- Ensure platform default org exists
INSERT INTO organizations (code, name, slug, status, contact_name)
SELECT 'DEFAULT', 'Platform default (ESP / Armanious)', 'default', 'active', 'Platform'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'DEFAULT');
