import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { webhookRetryDefaults } from '@/lib/httpRetry';
import { whatsappConfigStatus } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Lightweight readiness: env flags + Neon ping (no secrets leaked).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const retry = webhookRetryDefaults();
  const wa = whatsappConfigStatus();

  checks.env_google = {
    ok: !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID
    ),
    detail: 'service account + sheet id',
  };

  checks.env_database = {
    ok: !!process.env.DATABASE_URL,
    detail: 'DATABASE_URL set',
  };

  checks.process_secret = {
    ok: !!process.env.PROCESS_SECRET,
    detail: process.env.PROCESS_SECRET ? 'configured' : 'optional but recommended',
  };

  checks.http_retry = {
    ok: true,
    detail: `${retry.maxAttempts} attempts · base ${retry.baseDelayMs}ms · max ${retry.maxDelayMs}ms (WhatsApp + DDInter download)`,
  };

  checks.whatsapp = {
    ok: wa.mode !== 'none' || wa.dry_run_default,
    detail: `mode=${wa.mode} · safety_to=${wa.has_safety_to ? 'yes' : 'no'} · dry=${wa.dry_run_default}`,
  };

  if (process.env.DATABASE_URL) {
    try {
      const r = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM chronic_programs`
      );
      checks.neon = {
        ok: true,
        detail: `connected · programs=${r.rows[0]?.n ?? 0}`,
      };
    } catch (e: unknown) {
      checks.neon = {
        ok: false,
        detail: e instanceof Error ? e.message : 'query failed',
      };
    }
  } else {
    checks.neon = { ok: false, detail: 'skipped — no DATABASE_URL' };
  }

  const ok = checks.env_google.ok && checks.neon.ok;

  return NextResponse.json(
    {
      ok,
      service: 'medical-aid-automation',
      time: new Date().toISOString(),
      checks,
      retry,
    },
    { status: ok ? 200 : 503 }
  );
}
