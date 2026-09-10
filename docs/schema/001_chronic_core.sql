-- Medical Aid OS — core schema (Neon / PostgreSQL)
-- Applied to project: medical-aid-automation (lingering-poetry-76698285)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE program_status AS ENUM (
  'draft', 'active', 'suspended', 'expired', 'cancelled'
);

CREATE TYPE refill_status AS ENUM (
  'draft', 'submitted', 'in_review', 'approved',
  'partially_approved', 'rejected', 'needs_info',
  'dispensing', 'dispensed', 'cancelled'
);

CREATE TYPE item_status AS ENUM (
  'pending', 'approved', 'rejected', 'dispensed', 'skipped'
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_currency TEXT NOT NULL DEFAULT 'EGP',
  monthly_cap_egp NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  external_employee_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  branch TEXT,
  grade TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  monthly_cap_egp NUMERIC(12,2),
  hired_at DATE,
  terminated_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, external_employee_id)
);

CREATE TABLE dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  full_name TEXT NOT NULL,
  relation TEXT NOT NULL,
  date_of_birth DATE,
  national_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chronic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_code TEXT NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  dependent_id UUID NOT NULL REFERENCES dependents(id),
  status program_status NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE,
  renewal_mode TEXT NOT NULL DEFAULT 'monthly_refill',
  prescriber_name TEXT,
  prescriber_hospital TEXT,
  notes TEXT,
  source_response_row TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chronic_med_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
  line_code TEXT NOT NULL,
  requested_name TEXT NOT NULL,
  matched_name TEXT,
  meddb_id TEXT,
  scientific_name TEXT,
  form TEXT,
  strength TEXT,
  dose_text TEXT,
  qty_per_cycle NUMERIC(12,3) NOT NULL DEFAULT 1,
  days_supply INT NOT NULL DEFAULT 30,
  refill_frequency TEXT DEFAULT 'monthly',
  max_refills INT,
  formulary_flag TEXT,
  company_preferred BOOLEAN NOT NULL DEFAULT false,
  alternative_of TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, line_code)
);

CREATE TABLE refill_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES chronic_programs(id),
  period TEXT NOT NULL,
  status refill_status NOT NULL DEFAULT 'draft',
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  dispensed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  estimated_total_egp NUMERIC(12,2),
  approved_total_egp NUMERIC(12,2),
  company_gap_egp NUMERIC(12,2),
  external_claim_id TEXT,
  fulfillment_channel TEXT NOT NULL DEFAULT 'internal',
  fulfillment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, period)
);

CREATE TABLE refill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refill_cycle_id UUID NOT NULL REFERENCES refill_cycles(id) ON DELETE CASCADE,
  med_line_id UUID REFERENCES chronic_med_lines(id),
  line_code TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL,
  days_supply INT NOT NULL DEFAULT 30,
  unit_price_egp NUMERIC(12,2),
  line_total_egp NUMERIC(12,2),
  price_source TEXT,
  formulary_flag TEXT,
  company_preferred BOOLEAN NOT NULL DEFAULT false,
  status item_status NOT NULL DEFAULT 'pending',
  approved_qty NUMERIC(12,3),
  approved_amount_egp NUMERIC(12,2),
  rejection_reason TEXT,
  dispensed_qty NUMERIC(12,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (refill_cycle_id, line_code)
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  url TEXT NOT NULL,
  file_name TEXT,
  issued_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formulary_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  pattern TEXT NOT NULL,
  preferred_name TEXT NOT NULL,
  flag TEXT NOT NULL DEFAULT 'SUBSTITUTE',
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  from_value JSONB,
  to_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_org ON employees(org_id);
CREATE INDEX idx_dependents_employee ON dependents(employee_id);
CREATE INDEX idx_programs_employee ON chronic_programs(employee_id);
CREATE INDEX idx_programs_dependent ON chronic_programs(dependent_id);
CREATE INDEX idx_programs_status ON chronic_programs(status);
CREATE INDEX idx_programs_org_status ON chronic_programs(org_id, status);
CREATE INDEX idx_med_lines_program ON chronic_med_lines(program_id);
CREATE INDEX idx_refills_program ON refill_cycles(program_id);
CREATE INDEX idx_refills_period ON refill_cycles(period);
CREATE INDEX idx_refills_status ON refill_cycles(status);
CREATE INDEX idx_refill_items_cycle ON refill_items(refill_cycle_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_formulary_org ON formulary_rules(org_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
