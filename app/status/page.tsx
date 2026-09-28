import Link from 'next/link';

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
  return { ok, secretOk, checks };
}

export default async function StatusPage() {
  const health = await loadHealth();

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
                ? 'PROCESS_SECRET is set. Unlock on Home, then follow the ops checklist.'
                : 'Neon is connected. Set PROCESS_SECRET next so ops pages stay private.'
              : 'Google sheet credentials are optional and not required to start.'}
          </p>
        </div>

        {health.ok && !health.secretOk && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 text-sm">
            <h2 className="font-semibold text-amber-950">
              Recommended: set PROCESS_SECRET
            </h2>
            <p className="text-amber-900 text-xs" dir="rtl">
              بدون كلمة السر، صفحات التشغيل تبقى مقفولة. أضفها على Vercel ثم أعد
              النشر.
            </p>
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
                Add key{' '}
                <code className="bg-white/80 px-1 rounded">PROCESS_SECRET</code>{' '}
                with a long random value (example:{' '}
                <code className="bg-white/80 px-1 rounded text-[10px]">
                  openssl rand -hex 24
                </code>
                )
              </li>
              <li>
                Scope: <strong>Production</strong> (and Preview if you use it)
              </li>
              <li>
                <strong>Redeploy</strong> the latest Production deployment
              </li>
              <li>
                Open{' '}
                <Link href="/" className="underline font-medium">
                  Home
                </Link>{' '}
                → enter the same value → <strong>Unlock ops</strong>
              </li>
              <li>
                Follow checklist: Queue → Claims → Programs → Refills → Pharmacy
              </li>
            </ol>
            <p className="text-[11px] text-amber-800">
              Multiple staff passwords: comma-separated in the same variable, e.g.{' '}
              <code className="bg-white/80 px-1 rounded">alice-secret,bob-secret</code>
            </p>
          </div>
        )}

        {health.ok && (
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <h2 className="font-medium text-sm">Next steps</h2>
            <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
              {!health.secretOk && (
                <li className="text-amber-800 font-medium">
                  Set PROCESS_SECRET (box above) and unlock on Home
                </li>
              )}
              <li>
                <Link href="/guide" className="text-violet-700 font-medium hover:underline">
                  Read the guide
                </Link>
              </li>
              <li>
                <Link href="/intake" className="text-violet-700 hover:underline">
                  Submit a test request
                </Link>
              </li>
              <li>
                <Link href="/intake-ops" className="text-violet-700 hover:underline">
                  Intake queue
                </Link>{' '}
                → Process platform intake
              </li>
              <li>
                <Link href="/programs" className="text-violet-700 hover:underline">
                  Programs
                </Link>
                {' · '}
                <Link href="/claims" className="text-violet-700 hover:underline">
                  Claims
                </Link>
                {' · '}
                <Link href="/pharmacy" className="text-violet-700 hover:underline">
                  Pharmacy
                </Link>
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
                className={`text-right text-xs ${val.ok ? 'text-emerald-700' : 'text-amber-700'}`}
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
                Neon (pooler, sslmode=require)
              </li>
              <li>
                Add{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">PROCESS_SECRET</code>{' '}
                (strong random string)
              </li>
              <li>
                <strong>Redeploy</strong> from Deployments
              </li>
              <li>
                Refresh this page, then open{' '}
                <Link href="/guide" className="text-blue-700 underline">
                  /guide
                </Link>
              </li>
            </ol>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm justify-center pb-6">
          <Link href="/guide" className="text-violet-700 hover:underline font-medium">
            How to use
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
