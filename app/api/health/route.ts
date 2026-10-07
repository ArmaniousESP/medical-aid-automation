import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { webhookRetryDefaults } from '@/lib/httpRetry';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { loadEgyptianDrugs, searchEgyptianDrugs } from '@/lib/egyptianDrugs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Platform readiness: Neon required; Google optional (legacy).
 * Egyptian drug catalog is primary for search/estimate; MSH is fallback.
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

  const enrollOn = process.env.AUTO_ENROLL_INTAKE !== 'false';
  checks.auto_enroll = {
    ok: enrollOn,
    detail: enrollOn
      ? 'intake → chronic program on process (default on)'
      : 'disabled',
  };

  const claimOn = process.env.AUTO_CLAIM_ON_ENROLL !== 'false';
  checks.auto_claim = {
    ok: true,
    detail: claimOn
      ? 'draft claim on enroll (default on)'
      : 'off (AUTO_CLAIM_ON_ENROLL=false)',
  };

  checks.http_retry = {
    ok: true,
    detail: `${retry.maxAttempts} attempts · base ${retry.baseDelayMs}ms`,
  };

  checks.whatsapp = {
    ok: wa.mode !== 'none' || wa.dry_run_default,
    detail: `mode=${wa.mode}`,
  };

  // Primary medicine catalog (karem505/egyptian-drug-database)
  try {
    const drugs = await loadEgyptianDrugs();
    const sample = await searchEgyptianDrugs('Concor', 1);
    checks.egyptian_catalog = {
      ok: drugs.length > 1000,
      detail: `primary · ${drugs.length} medicines · sample=${sample.items[0]?.name_en || 'n/a'} · MSH=fallback`,
    };
  } catch (e: unknown) {
    checks.egyptian_catalog = {
      ok: false,
      detail:
        e instanceof Error
          ? `load failed: ${e.message}`
          : 'Egyptian CSV unreachable — intake falls back to MSH',
    };
  }

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
      try {
        const fm = await query<{ n: string; eva: string }>(
          `SELECT count(*)::text AS n,
                  count(*) FILTER (WHERE eva IS NOT NULL AND trim(eva) <> '')::text AS eva
           FROM formulary_meds`
        ).catch(() => ({ rows: [{ n: '0', eva: '0' }] }));
        const n = Number(fm.rows[0]?.n || 0);
        checks.formulary = {
          ok: n > 0,
          detail:
            n > 0
              ? `formulary_meds=${n} · with_eva=${fm.rows[0]?.eva ?? 0}`
              : 'empty — seed via MSH or POST /api/formulary/sync',
        };
      } catch {
        checks.formulary = {
          ok: false,
          detail: 'formulary_meds missing',
        };
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

  const ok = checks.env_database.ok && (checks.neon?.ok ?? false);

  return NextResponse.json(
    {
      ok,
      service: 'medical-aid-automation',
      path: 'platform-first (sheet optional)',
      medicine_catalog: 'egyptian-drug-database primary · MSH fallback',
      guide: '/guide',
      time: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
