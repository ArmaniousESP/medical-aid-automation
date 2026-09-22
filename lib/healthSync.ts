/**
 * Automated health-data sync pipeline
 * Form responses → Approved sheet processing → chronic programs in Neon
 */

import { processNewResponses } from '@/lib/processor';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';
import { query } from '@/lib/db';
import { softStep } from '@/lib/errors';

export type HealthSyncOptions = {
  /** Skip Google form process step */
  skipProcess?: boolean;
  /** Skip Approved → programs enroll */
  skipSync?: boolean;
  /** dry-run process only (no sheet writes) */
  processDryRun?: boolean;
  trigger?: string;
};

export type HealthSyncResult = {
  ok: boolean;
  partial: boolean;
  trigger: string;
  duration_ms: number;
  run_id?: string;
  process: unknown | null;
  sync: unknown | null;
  errors: Array<{ step: string; error: string; soft?: boolean }>;
};

export async function ensureHealthSyncTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS health_sync_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        trigger TEXT,
        ok BOOLEAN,
        partial BOOLEAN DEFAULT false,
        process_json JSONB,
        sync_json JSONB,
        error TEXT,
        duration_ms INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  } catch {
    /* ignore */
  }
}

export async function runHealthDataSync(
  opts: HealthSyncOptions = {}
): Promise<HealthSyncResult> {
  const started = Date.now();
  const trigger = opts.trigger || 'manual';
  const errors: HealthSyncResult['errors'] = [];

  let processData: unknown = null;
  let syncData: unknown = null;

  const hasGoogle =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_PRIVATE_KEY &&
    !!process.env.GOOGLE_SHEET_ID;
  const hasDb = !!process.env.DATABASE_URL;

  // 1) Process new form responses into Approved-Requests
  if (!opts.skipProcess) {
    if (!hasGoogle) {
      errors.push({
        step: 'process',
        error: 'GOOGLE_* / GOOGLE_SHEET_ID not configured',
        soft: true,
      });
    } else {
      const step = await softStep(
        'process',
        () => processNewResponses(!!opts.processDryRun),
        { optional: true }
      );
      if (step.ok) processData = step.data;
      else
        errors.push({
          step: 'process',
          error: step.error || 'process failed',
          soft: step.soft,
        });
    }
  }

  // 2) Sync Approved-Requests → chronic programs + med lines + roshetta
  if (!opts.skipSync) {
    if (!hasDb) {
      errors.push({
        step: 'sync',
        error: 'DATABASE_URL not set',
        soft: true,
      });
    } else if (!hasGoogle) {
      errors.push({
        step: 'sync',
        error: 'GOOGLE_* required to read Approved-Requests',
        soft: true,
      });
    } else {
      const step = await softStep('sync', () => syncApprovedToPrograms(), {
        optional: true,
      });
      if (step.ok) syncData = step.data;
      else
        errors.push({
          step: 'sync',
          error: step.error || 'sync failed',
          soft: step.soft,
        });
    }
  }

  const hardErrors = errors.filter((e) => !e.soft);
  const ok = hardErrors.length === 0;
  const partial = errors.length > 0;
  const duration_ms = Date.now() - started;

  let run_id: string | undefined;
  if (hasDb) {
    try {
      await ensureHealthSyncTable();
      const ins = await query<{ id: string }>(
        `INSERT INTO health_sync_runs (
           finished_at, trigger, ok, partial, process_json, sync_json, error, duration_ms
         ) VALUES (now(), $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
         RETURNING id`,
        [
          trigger,
          ok,
          partial,
          processData ? JSON.stringify(processData) : null,
          syncData ? JSON.stringify(syncData) : null,
          errors.length
            ? errors.map((e) => `${e.step}: ${e.error}`).join('; ')
            : null,
          duration_ms,
        ]
      );
      run_id = ins.rows[0]?.id;
    } catch (e) {
      console.error('health_sync_runs insert failed', e);
    }
  }

  return {
    ok,
    partial,
    trigger,
    duration_ms,
    run_id,
    process: processData,
    sync: syncData,
    errors,
  };
}

export async function listHealthSyncRuns(limit = 20) {
  await ensureHealthSyncTable();
  const res = await query(
    `SELECT id, started_at, finished_at, trigger, ok, partial, duration_ms, error,
            process_json, sync_json
     FROM health_sync_runs
     ORDER BY started_at DESC
     LIMIT $1`,
    [Math.min(limit, 50)]
  );
  return res.rows;
}
