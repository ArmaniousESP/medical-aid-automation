/**
 * Lightweight ops audit trail (who did what, on which entity).
 * Not a full compliance suite — enough for program accountability.
 */

import { query } from '@/lib/db';

let ensured = false;

export async function ensureAuditTable(): Promise<void> {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      at TIMESTAMPTZ NOT NULL DEFAULT now(),
      actor TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      org_code TEXT,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_events (at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events (entity_type, entity_id)`
  );
  ensured = true;
}

export async function writeAudit(input: {
  actor?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string;
  org_code?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await ensureAuditTable();
    await query(
      `INSERT INTO audit_events (actor, action, entity_type, entity_id, org_code, meta)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        input.actor || null,
        input.action,
        input.entity_type || null,
        input.entity_id || null,
        input.org_code || null,
        JSON.stringify(input.meta || {}),
      ]
    );
  } catch {
    /* never block main path */
  }
}
