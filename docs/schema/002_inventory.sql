-- Inventory tracking for pharmacy stock

DO $$ BEGIN
  CREATE TYPE inventory_move_type AS ENUM (
    'receive', 'dispense', 'adjust', 'return', 'write_off'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inventory_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code TEXT NOT NULL UNIQUE,
  drug_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pack',
  min_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  sku_id UUID PRIMARY KEY REFERENCES inventory_skus(id) ON DELETE CASCADE,
  qty_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  qty_reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES inventory_skus(id),
  move_type inventory_move_type NOT NULL,
  qty NUMERIC(12,3) NOT NULL,
  balance_after NUMERIC(12,3),
  ref_type TEXT,
  ref_id UUID,
  actor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_moves_sku ON inventory_moves(sku_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_moves_ref ON inventory_moves(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_inv_skus_name ON inventory_skus (lower(drug_name));
