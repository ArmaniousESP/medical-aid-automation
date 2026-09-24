import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { webhookRetryDefaults } from '@/lib/httpRetry';
import { whatsappConfigStatus } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Platform readiness: Neon is required; Google sheet is optional (legacy).
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const retry = webhookRetryDefaults();
  const wa = whatsappConfigStatus();

  checks.env_database = {
    ok: !!process.env.DATABASE_URL,
    detail: 'DATABASE_URL set',
  };

  checks.env_google = {
    ok: !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID
    ),
    detail: 'optional — legacy sheet path',
  };

  checks.process_secret = {
    ok: !!process.env.PROCESS_SECRET,
    detail: process.env.PROCESS_SECRET ? 'configured' : 'optional but recommended',
  };

  checks.auto_enroll = {
    ok: process.env.AUTO_ENROLL_INTAKE !== 'false',
    detail:
      process.env.AUTO_ENROLL_INTAKE === 'false'
        ? 'disabled'
        : 'intake → chronic program on process',
  };

  checks.auto_claim = {
    ok: true,
    detail:
      process.env.AUTO_CLAIM_ON_ENROLL === 'true' ||
      process.env.AUTO_CLAIM_ON_ENROLL === '1'
        ? 'draft claim on enroll'
        : 'off (set AUTO_CLAIM_ON_ENROLL=true)',
  };

  checks.http_retry = {
    ok: true,
    detail: `${retry.maxAttempts} attempts · base ${retry.baseDelayMs}ms`,
  };

  checks.whatsapp = {
    ok: wa.mode !== 'none' || wa.dry_run_default,
    detail: `mode=${wa.mode}`,
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
      try {
        const ar = await query<{ n: string }>(
          `SELECT count(*)::text AS n FROM aid_requests`
        ).catch(() => ({ rows: [{ n: '0' }] }));
        checks.intake = {
          ok: true,
          detail: `aid_requests=${ar.rows[0]?.n ?? 0}`,
        };
      } catch {
        checks.intake = {
          ok: true,
          detail: 'table will be created on first submit',
        };
      }
      try {
        const cl = await query<{ n: string }>(
          `SELECT count(*)::text AS n FROM claims`
        ).catch(() => ({ rows: [{ n: '0' }] }));
        checks.claims = {
          ok: true,
          detail: `claims=${cl.rows[0]?.n ?? 0}`,
        };
      } catch {
        checks.claims = { ok: true, detail: 'table on first use' };
      }
    } catch (e: unknown) {
      checks.neon = {
        ok: false,
        detail: e instanceof Error ? e.message : 'query failed',
      };
    }
  } else {
    checks.neon = { ok: false, detail: 'skipped — no DATABASE_URL' };
  }

  // Platform healthy if Neon works; Google not required
  const ok = checks.env_database.ok && (checks.neon?.ok ?? false);

  return NextResponse.json(
    {
      ok,
      service: 'medical-aid-automation',
      path: 'platform-first (sheet optional)',
      guide: '/guide',
      time: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
