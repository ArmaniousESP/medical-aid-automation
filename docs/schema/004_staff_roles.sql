-- Staff roles for Google / ops access (runs alongside OPS_ALLOWED_EMAILS)
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
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_email_lower_uidx
  ON staff_roles (lower(email));

CREATE INDEX IF NOT EXISTS staff_roles_role_idx ON staff_roles (role)
  WHERE active = true;
