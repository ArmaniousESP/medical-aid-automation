import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function loadHealth() {
  const base = process.env.VERCEL_APP_URL || process.env.VERCEL_URL;
  try {
    const checks: Record<string, { ok: boolean; detail?: string }> = {
      env_google: {
        ok: !!(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
          process.env.GOOGLE_PRIVATE_KEY &&
          process.env.GOOGLE_SHEET_ID
        ),
        detail: 'GOOGLE_SERVICE_ACCOUNT_EMAIL + PRIVATE_KEY + SHEET_ID',
      },
      env_database: {
        ok: !!process.env.DATABASE_URL,
        detail: 'DATABASE_URL (Neon pooler)',
      },
      process_secret: {
        ok: !!process.env.PROCESS_SECRET,
        detail: process.env.PROCESS_SECRET
          ? 'configured'
          : 'not set — optional; create any strong random string',
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
          detail: `connected · programs=${r.rows[0]?.n ?? 0}`,
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
    const ok = checks.env_database.ok && checks.neon.ok;
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
            {health.ok ? 'جاهز للتشغيل (Neon)' : 'يحتاج إعداد على Vercel'}
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

        {!health.ok && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-3">
            <h2 className="font-semibold">خطوات الإعداد (Vercel)</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>
                افتح المشروع على Vercel →{' '}
                <strong>Settings → Environment Variables</strong>
              </li>
              <li>
                أضف <code className="text-xs bg-slate-100 px-1 rounded">DATABASE_URL</code>{' '}
                من Neon (Connection string · <strong>pooler</strong> · sslmode=require)
              </li>
              <li>
                أضف <code className="text-xs bg-slate-100 px-1 rounded">PROCESS_SECRET</code>{' '}
                — أنشئه بنفسك (مثلاً:{' '}
                <code className="text-xs bg-slate-100 px-1">openssl rand -hex 32</code>
                ). ليس موجوداً مسبقاً في أي مكان.
              </li>
              <li>
                (اختياري للشيت){' '}
                <code className="text-xs bg-slate-100 px-1">GOOGLE_*</code> +{' '}
                <code className="text-xs bg-slate-100 px-1">GOOGLE_SHEET_ID</code>
              </li>
              <li>
                <strong>Redeploy</strong> من Deployments بعد الحفظ
              </li>
            </ol>
            <p className="text-xs text-slate-500">
              بعد الـ redeploy حدّث هذه الصفحة. Neon يحتوي حالياً بيانات seed
              (برامج / أدوية / دورات).
            </p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Crons: daily process 06:00 UTC · monthly refills day 1 05:00 UTC
          (vercel.json + GitHub Actions)
          {health.base ? ` · host: ${health.base}` : ''}
        </p>
      </div>
    </main>
  );
}
