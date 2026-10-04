import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { bitrixConfigStatus } from '@/lib/bitrix';

export const dynamic = 'force-dynamic';

async function loadHealth() {
  const checks: Record<
    string,
    { ok: boolean; detail?: string; required?: boolean; recommended?: boolean }
  > = {
    env_database: {
      ok: !!process.env.DATABASE_URL,
      detail: 'DATABASE_URL (Neon pooler) — required for platform',
      required: true,
    },
    process_secret: {
      ok: !!process.env.PROCESS_SECRET,
      detail: process.env.PROCESS_SECRET
        ? 'Set — unlock on Home for ops pages'
        : 'Not set — add to lock ops; unlock from Home',
      required: false,
      recommended: true,
    },
    env_google: {
      ok: !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SHEET_ID
      ),
      detail: 'Optional — only for legacy Google sheet path',
      required: false,
    },
    auto_enroll: {
      ok: process.env.AUTO_ENROLL_INTAKE !== 'false',
      detail:
        process.env.AUTO_ENROLL_INTAKE === 'false'
          ? 'Off — process will match only'
          : 'On — process enrolls chronic programs',
      required: false,
    },
  };

  const wa = whatsappConfigStatus();
  checks.whatsapp = {
    ok: wa.mode !== 'none',
    detail:
      wa.mode === 'none'
        ? 'No provider — set Meta or Twilio env (see /notifications)'
        : `mode=${wa.mode}${wa.dry_run_default ? ' · dry-run' : ' · live-ready'}${wa.provider_forced ? ` · forced=${wa.provider_forced}` : ''}`,
    required: false,
    recommended: true,
  };

  const bx = bitrixConfigStatus();
  checks.bitrix = {
    ok: !bx.sync_on_intake || bx.configured,
    detail: bx.sync_on_intake
      ? bx.configured
        ? 'Sync on intake ON · webhook set'
        : 'BITRIX_SYNC_ON_INTAKE=1 but webhook missing'
      : bx.configured
        ? 'Webhook set · sync off (optional)'
        : 'Optional office bridge — off',
    required: false,
  };

  checks.email = {
    ok: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    detail:
      process.env.RESEND_API_KEY && process.env.EMAIL_FROM
        ? 'Resend configured'
        : 'Optional — RESEND_API_KEY + EMAIL_FROM',
    required: false,
  };

  if (process.env.DATABASE_URL) {
    try {
      const { query } = await import('@/lib/db');
      const r = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM chronic_programs`
      );
      checks.neon = {
        ok: true,
        detail: `Connected · programs=${r.rows[0]?.n ?? 0}`,
        required: true,
      };
      try {
        const ar = await query<{ n: string; pending: string }>(
          `SELECT count(*)::text AS n,
                  count(*) FILTER (WHERE status IN ('submitted','triage'))::text AS pending
           FROM aid_requests`
        );
        checks.intake = {
          ok: true,
          detail: `aid_requests=${ar.rows[0]?.n ?? 0} · pending=${ar.rows[0]?.pending ?? 0}`,
          required: false,
        };
      } catch {
        checks.intake = {
          ok: true,
          detail: 'Table created on first /intake submit',
          required: false,
        };
      }
      try {
        const cl = await query<{ n: string }>(
          `SELECT count(*)::text AS n FROM claims`
        );
        checks.claims = {
          ok: true,
          detail: `claims=${cl.rows[0]?.n ?? 0}`,
          required: false,
        };
      } catch {
        checks.claims = {
          ok: true,
          detail: 'Table created on first claim',
          required: false,
        };
      }
      try {
        const d = new Date();
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const rc = await query<{ n: string; open: string }>(
          `SELECT count(*)::text AS n,
                  count(*) FILTER (WHERE status IS DISTINCT FROM 'dispensed' AND status IS DISTINCT FROM 'cancelled')::text AS open
           FROM refill_cycles WHERE period = $1`,
          [period]
        );
        checks.refills_month = {
          ok: true,
          detail: `${period}: cycles=${rc.rows[0]?.n ?? 0} · open=${rc.rows[0]?.open ?? 0}`,
          required: false,
        };
      } catch {
        checks.refills_month = {
          ok: true,
          detail: 'refill_cycles when programs generate cycles',
          required: false,
        };
      }
    } catch (e: unknown) {
      checks.neon = {
        ok: false,
        detail: e instanceof Error ? e.message : 'connection failed',
        required: true,
      };
    }
  } else {
    checks.neon = {
      ok: false,
      detail: 'No DATABASE_URL',
      required: true,
    };
  }

  const ok = !!checks.env_database?.ok && !!checks.neon?.ok;
  const secretOk = !!checks.process_secret?.ok;
  return { ok, secretOk, checks, wa, bx };
}

export default async function StatusPage() {
  const health = await loadHealth();
  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">System status</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            حالة النظام · هل المنصة جاهزة؟
          </p>
        </header>

        <div
          className={`rounded-xl border p-4 ${
            health.ok
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-300'
          }`}
        >
          <div className="font-semibold">
            {health.ok
              ? 'Database ready — platform cycle can run'
              : 'Setup needed — add DATABASE_URL on Vercel'}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {health.ok
              ? health.secretOk
                ? 'PROCESS_SECRET is set. Unlock on Home, then follow the monthly ops path below.'
                : 'Neon is connected. Set PROCESS_SECRET next so ops pages stay private.'
              : 'Google sheet credentials are optional and not required to start.'}
          </p>
        </div>

        {health.ok && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 space-y-3 text-sm">
            <h2 className="font-semibold text-violet-950">
              This month ops path · {period}
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-violet-950 text-xs sm:text-sm">
              <li>
                Unlock on{' '}
                <Link href="/" className="underline font-medium">
                  Home
                </Link>{' '}
                with PROCESS_SECRET
              </li>
              <li>
                <Link href="/intake-ops" className="underline font-medium">
                  1 Queue
                </Link>{' '}
                — process pending platform intake
              </li>
              <li>
                <Link href="/claims" className="underline font-medium">
                  2 Claims
                </Link>{' '}
                — review drafts · submit
              </li>
              <li>
                <Link href="/pharmacy" className="underline font-medium">
                  3 Pharmacy
                </Link>{' '}
                — filter EVA / Not EVA · CSV · batch dispense
              </li>
              <li>
                <Link href="/programs" className="underline font-medium">
                  4 Programs
                </Link>{' '}
                — chronic enrollments
              </li>
              <li>
                <Link href="/refills" className="underline font-medium">
                  5 Refills
                </Link>{' '}
                — monthly cycles · safety queue
              </li>
              <li>
                <Link href="/notifications" className="underline font-medium">
                  WhatsApp
                </Link>{' '}
                — dry-run due reminders when provider is set
              </li>
            </ol>
          </div>
        )}

        {health.ok && health.wa.mode === 'none' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2 text-sm">
            <h2 className="font-semibold text-blue-950">Next: WhatsApp Business</h2>
            <p className="text-xs text-blue-900">
              Add Meta or Twilio env on Vercel, redeploy, then test on{' '}
              <Link href="/notifications" className="underline font-medium">
                /notifications
              </Link>
              . Full steps: docs/whatsapp-setup.md
            </p>
            <ul className="text-xs text-blue-900 list-disc list-inside space-y-1">
              <li>
                Meta: WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID
              </li>
              <li>
                Twilio: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
                TWILIO_WHATSAPP_FROM + WHATSAPP_PROVIDER=twilio
              </li>
              <li>Start with WHATSAPP_DRY_RUN=1</li>
            </ul>
          </div>
        )}

        {health.ok && !health.secretOk && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 text-sm">
            <h2 className="font-semibold text-amber-950">
              Recommended: set PROCESS_SECRET
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-amber-950 text-xs">
              <li>
                Open{' '}
                <a
                  href="https://vercel.com/armanious-foundation/medical-aid-automation/settings/environment-variables"
                  className="underline font-medium"
                  target="_blank"
                  rel="noreferrer"
                >
                  Vercel → Environment Variables
                </a>
              </li>
              <li>
                Add <code className="bg-white/80 px-1 rounded">PROCESS_SECRET</code>
              </li>
              <li>
                <strong>Redeploy</strong>, then unlock on Home
              </li>
            </ol>
          </div>
        )}

        <ul className="rounded-xl border bg-white divide-y shadow-sm">
          {Object.entries(health.checks).map(([key, val]) => (
            <li key={key} className="flex justify-between gap-3 p-3 text-sm">
              <div>
                <span className="font-mono text-xs">{key}</span>
                {val.required && (
                  <span className="ml-1 text-[10px] text-slate-400">required</span>
                )}
                {val.recommended && !val.required && (
                  <span className="ml-1 text-[10px] text-amber-600">recommended</span>
                )}
              </div>
              <span
                className={`text-right text-xs max-w-[60%] ${val.ok ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {val.ok ? 'OK' : 'Missing'} {val.detail ? `· ${val.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>

        {!health.ok && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-3">
            <h2 className="font-semibold">Setup on Vercel</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>
                Project → <strong>Settings → Environment Variables</strong>
              </li>
              <li>
                Add <code className="text-xs bg-slate-100 px-1 rounded">DATABASE_URL</code> from
                Neon
              </li>
              <li>
                Add{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">PROCESS_SECRET</code>
              </li>
              <li>
                <strong>Redeploy</strong>
              </li>
            </ol>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm justify-center pb-6">
          <Link href="/guide" className="text-violet-700 hover:underline font-medium">
            How to use
          </Link>
          <Link href="/notifications" className="text-blue-600 hover:underline">
            Notifications
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/api/health" className="text-slate-500 hover:underline text-xs">
            JSON health
          </Link>
        </div>
      </div>
    </main>
  );
}
