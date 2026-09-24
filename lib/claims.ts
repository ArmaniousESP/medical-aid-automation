/**
 * Internal claims ledger for monthly medical aid.
 * Creates claim drafts from enrolled intake / programs.
 * Optional outbound webhook for external TPA/claims systems.
 *
 * Env:
 *   CLAIMS_WEBHOOK_URL — POST JSON on submit
 *   CLAIMS_WEBHOOK_SECRET — optional bearer
 *   AUTO_CLAIM_ON_ENROLL=true — create draft claim after intake enroll
 */

import { query } from '@/lib/db';
import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';
import { AppError } from '@/lib/errors';

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type ClaimLineInput = {
  description: string;
  qty?: number;
  unit_amount_egp?: number | null;
  line_total_egp?: number | null;
  med_name?: string;
};

export async function ensureClaimsTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_code TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      aid_request_id UUID,
      program_id UUID,
      emp_name TEXT,
      emp_id TEXT,
      patient_name TEXT,
      period TEXT,
      currency TEXT DEFAULT 'EGP',
      total_claimed_egp NUMERIC,
      total_approved_egp NUMERIC,
      notes TEXT,
      external_ref TEXT,
      error_log JSONB DEFAULT '[]'::jsonb,
      submitted_at TIMESTAMPTZ,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(`
    CREATE TABLE IF NOT EXISTS claim_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      line_no INT NOT NULL DEFAULT 1,
      description TEXT NOT NULL,
      med_name TEXT,
      qty NUMERIC DEFAULT 1,
      unit_amount_egp NUMERIC,
      line_total_egp NUMERIC,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_claims_aid ON claims(aid_request_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_claims_program ON claims(program_id)`
  );
}

function periodNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function nextClaimCode(): Promise<string> {
  const y = new Date().getFullYear();
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM claims WHERE claim_code LIKE $1`,
    [`CLM-${y}-%`]
  );
  const n = Number(res.rows[0]?.n || 0) + 1;
  return `CLM-${y}-${String(n).padStart(5, '0')}`;
}

export async function createClaimDraft(input: {
  aid_request_id?: string;
  program_id?: string;
  emp_name?: string;
  emp_id?: string;
  patient_name?: string;
  period?: string;
  notes?: string;
  lines: ClaimLineInput[];
}) {
  await ensureClaimsTables();
  if (!input.lines?.length) {
    throw new AppError('Claim requires at least one line', {
      code: 'validation',
      status: 400,
    });
  }

  // Idempotent: one draft/submitted claim per aid_request per period
  if (input.aid_request_id) {
    const period = input.period || periodNow();
    const existing = await query<{ id: string; claim_code: string; status: string }>(
      `SELECT id, claim_code, status FROM claims
       WHERE aid_request_id = $1 AND period = $2
         AND status IN ('draft','submitted','under_review','approved','paid')
       ORDER BY created_at DESC LIMIT 1`,
      [input.aid_request_id, period]
    );
    if (existing.rows[0]) {
      return {
        created: false,
        id: existing.rows[0].id,
        claim_code: existing.rows[0].claim_code,
        status: existing.rows[0].status,
        message: 'Claim already exists for this request/period',
      };
    }
  }

  let total = 0;
  let hasTotal = false;
  for (const line of input.lines) {
    const lt =
      line.line_total_egp != null
        ? Number(line.line_total_egp)
        : line.unit_amount_egp != null
          ? Number(line.unit_amount_egp) * (line.qty || 1)
          : null;
    if (lt != null && !Number.isNaN(lt)) {
      total += lt;
      hasTotal = true;
    }
  }

  const claim_code = await nextClaimCode();
  const ins = await query<{ id: string }>(
    `INSERT INTO claims (
       claim_code, status, aid_request_id, program_id,
       emp_name, emp_id, patient_name, period, total_claimed_egp, notes
     ) VALUES ($1,'draft',$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      claim_code,
      input.aid_request_id || null,
      input.program_id || null,
      input.emp_name || null,
      input.emp_id || null,
      input.patient_name || null,
      input.period || periodNow(),
      hasTotal ? Math.round(total * 100) / 100 : null,
      input.notes || null,
    ]
  );
  const claimId = ins.rows[0].id;

  let lineNo = 0;
  for (const line of input.lines) {
    lineNo += 1;
    const lt =
      line.line_total_egp != null
        ? Number(line.line_total_egp)
        : line.unit_amount_egp != null
          ? Number(line.unit_amount_egp) * (line.qty || 1)
          : null;
    await query(
      `INSERT INTO claim_lines (
         claim_id, line_no, description, med_name, qty, unit_amount_egp, line_total_egp
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        claimId,
        lineNo,
        line.description,
        line.med_name || line.description,
        line.qty ?? 1,
        line.unit_amount_egp ?? null,
        lt,
      ]
    );
  }

  return {
    created: true,
    id: claimId,
    claim_code,
    status: 'draft',
    total_claimed_egp: hasTotal ? Math.round(total * 100) / 100 : null,
  };
}

export async function listClaims(opts?: {
  status?: string;
  limit?: number;
  q?: string;
}) {
  await ensureClaimsTables();
  const params: unknown[] = [];
  const where = ['1=1'];
  if (opts?.status && opts.status !== 'all') {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts?.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(
      `(claim_code ILIKE $${params.length} OR emp_name ILIKE $${params.length} OR patient_name ILIKE $${params.length})`
    );
  }
  params.push(Math.min(opts?.limit ?? 50, 200));
  const res = await query(
    `SELECT * FROM claims WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return res.rows;
}

export async function getClaim(id: string) {
  await ensureClaimsTables();
  const c = await query(`SELECT * FROM claims WHERE id = $1`, [id]);
  if (!c.rows[0]) {
    throw new AppError('Claim not found', { code: 'not_found', status: 404 });
  }
  const lines = await query(
    `SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_no`,
    [id]
  );
  return { claim: c.rows[0], lines: lines.rows };
}

export async function updateClaimStatus(
  id: string,
  status: ClaimStatus,
  opts?: { notes?: string; total_approved_egp?: number; external_ref?: string; error?: unknown }
) {
  await ensureClaimsTables();
  await query(
    `UPDATE claims SET
       status = $2,
       notes = COALESCE($3, notes),
       total_approved_egp = COALESCE($4, total_approved_egp),
       external_ref = COALESCE($5, external_ref),
       error_log = CASE
         WHEN $6::jsonb IS NOT NULL THEN error_log || $6::jsonb
         ELSE error_log
       END,
       submitted_at = CASE WHEN $2 = 'submitted' THEN COALESCE(submitted_at, now()) ELSE submitted_at END,
       decided_at = CASE WHEN $2 IN ('approved','paid','rejected') THEN now() ELSE decided_at END,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      status,
      opts?.notes || null,
      opts?.total_approved_egp ?? null,
      opts?.external_ref || null,
      opts?.error ? JSON.stringify([opts.error]) : null,
    ]
  );
}

/** Push claim to external claims system if configured */
export async function submitClaimExternal(claimId: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  external_ref?: string;
  error?: string;
  attempts?: number;
}> {
  const url = process.env.CLAIMS_WEBHOOK_URL;
  if (!url) {
    await updateClaimStatus(claimId, 'submitted', {
      notes: 'Submitted internally (no CLAIMS_WEBHOOK_URL)',
    });
    return { ok: true, skipped: true };
  }

  const full = await getClaim(claimId);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.CLAIMS_WEBHOOK_SECRET) {
    headers.Authorization = `Bearer ${process.env.CLAIMS_WEBHOOK_SECRET}`;
  }

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'claim.submitted',
          claim: full.claim,
          lines: full.lines,
        }),
      },
      webhookRetryDefaults()
    );
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }

    if (!response.ok) {
      const errDetail = {
        at: new Date().toISOString(),
        step: 'claims_webhook',
        http: response.status,
        body: data,
        attempts,
        errors,
      };
      await updateClaimStatus(claimId, 'under_review', {
        error: errDetail,
        notes: `Webhook HTTP ${response.status}`,
      });
      return {
        ok: false,
        attempts,
        error: `HTTP ${response.status}`,
      };
    }

    const external_ref =
      data.id || data.claim_id || data.reference || data.external_ref || null;
    await updateClaimStatus(claimId, 'submitted', {
      external_ref: external_ref ? String(external_ref) : undefined,
    });
    return { ok: true, external_ref: external_ref || undefined, attempts };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'webhook failed';
    await updateClaimStatus(claimId, 'under_review', {
      error: {
        at: new Date().toISOString(),
        step: 'claims_webhook',
        message: msg,
      },
      notes: msg,
    });
    return { ok: false, error: msg };
  }
}
