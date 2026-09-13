import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function loadHealth() {
  // Server-side: call checks directly via same process logic
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  try {
    // Prefer in-process: import health logic inline by querying env
    const { query } = await import('@/lib/db');
    const checks: Record<string, { ok: boolean; detail?: string }> = {
      env_google: {
        ok: !!(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
          process.env.GOOGLE_PRIVATE_KEY &&
          process.env.GOOGLE_SHEET_ID
        ),
      },
      env_database: { ok: !!process.env.DATABASE_URL },
      process_secret: { ok: !!process.env.PROCESS_SECRET },
    };
    if (process.env.DATABASE_URL) {
      try {
        const r = await query<{ n: string }>(
          `SELECT count(*)::text AS n FROM chronic_programs`
        );
        checks.neon = {
          ok: true,
          detail: `programs=${r.rows[0]?.n ?? 0}`,
        };
      } catch (e: unknown) {
        checks.neon = {
          ok: false,
          detail: e instanceof Error ? e.message : 'fail',
        };
      }
    } else {
      checks.neon = { ok: false, detail: 'no DATABASE_URL' };
    }
    const ok = checks.env_google.ok && checks.neon.ok;
    return { ok, checks, base };
  } catch (e: unknown) {
    return {
      ok: false,
      checks: {
        boot: {
          ok: false,
          detail: e instanceof Error ? e.message : 'error',
        },
      },
      base,
    };
  }
}

export default async function StatusPage() {
  const health = await loadHealth();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">حالة النظام</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            الرئيسية
          </Link>
        </header>

        <div
          className={`rounded-lg border p-4 ${
            health.ok
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-300'
          }`}
        >
          <div className="font-medium">
            {health.ok ? 'جاهز للتشغيل' : 'يحتاج إعداد'}
          </div>
          <p className="text-xs text-slate-600 mt-1">GET /api/health</p>
        </div>

        <ul className="rounded-lg border bg-white divide-y shadow-sm">
          {Object.entries(health.checks).map(([key, val]) => (
            <li key={key} className="flex justify-between gap-3 p-3 text-sm">
              <span className="font-mono text-xs">{key}</span>
              <span className={val.ok ? 'text-emerald-700' : 'text-amber-700'}>
                {val.ok ? 'OK' : '—'} {val.detail ? `· ${val.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500">
          Crons: daily process 06:00 UTC · monthly refills day 1 05:00 UTC
          (vercel.json + GitHub Actions)
        </p>
      </div>
    </main>
  );
}
