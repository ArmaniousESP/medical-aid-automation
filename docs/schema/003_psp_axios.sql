-- Axios-aligned PSP extensions (run on Neon once)

CREATE TABLE IF NOT EXISTS adherence_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessor TEXT,
  -- WHO 5 dimensions: scores 1-5 each
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_band TEXT, -- low | medium | high
  interventions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adherence_program ON adherence_assessments(program_id);

ALTER TABLE chronic_programs
  ADD COLUMN IF NOT EXISTS eligibility_tier TEXT DEFAULT 'full_cover',
  ADD COLUMN IF NOT EXISTS monthly_patient_share_egp NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS journey_stage TEXT DEFAULT 'enrolled',
  ADD COLUMN IF NOT EXISTS disease_area TEXT;

-- journey_stage values:
-- referred | eligibility | needs_assessment | enrolled | on_treatment |
-- follow_up | completed | dropped_out | suspended

COMMENT ON COLUMN chronic_programs.eligibility_tier IS 'PFET-style: full_cover|partial|self_pay|review';
COMMENT ON COLUMN chronic_programs.journey_stage IS 'Axios PSP patient journey stage';
