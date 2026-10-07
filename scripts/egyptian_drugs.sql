-- Egyptian market catalog (karem505/egyptian-drug-database, CC0)
-- Loaded by POST /api/catalog/egyptian { "action": "sync" }

CREATE TABLE IF NOT EXISTS egyptian_drugs (
  id bigserial PRIMARY KEY,
  commercial_name_en text NOT NULL,
  commercial_name_ar text,
  scientific_name text,
  manufacturer text,
  drug_class text,
  route text,
  price_egp numeric(12, 2),
  source text NOT NULL DEFAULT 'karem505/egyptian-drug-database',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commercial_name_en)
);

CREATE INDEX IF NOT EXISTS egyptian_drugs_en_lower_idx
  ON egyptian_drugs (lower(commercial_name_en));
CREATE INDEX IF NOT EXISTS egyptian_drugs_sci_lower_idx
  ON egyptian_drugs (lower(scientific_name));
