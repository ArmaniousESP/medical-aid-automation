import Link from 'next/link';

/**
 * Banner when critical env is missing — platform needs Neon; Google is optional.
 */
export function SetupBanner() {
  const hasDb = !!process.env.DATABASE_URL;
  const hasGoogle = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );

  // Platform path only needs DB; don't block on Google
  if (hasDb) {
    if (hasGoogle) return null;
    // Soft hint only — sheet is legacy
    return (
      <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span>
          Platform ready (Neon). Google sheet is optional for legacy processing.
        </span>
        <Link href="/guide" className="text-violet-700 font-medium hover:underline">
          How to use →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
      <div className="font-semibold text-amber-900">Setup required</div>
      <p className="mt-1 text-slate-700">
        Add <code className="bg-white/80 px-1 rounded text-xs">DATABASE_URL</code>{' '}
        (Neon pooler) on Vercel, then Redeploy. Without it, intake, programs, and
        claims will not work.
      </p>
      <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-slate-600">
        <li>
          Vercel → Project → Settings → Environment Variables → Production → Save
        </li>
        <li>Deployments → Redeploy (use latest main commit)</li>
        <li>
          Then open{' '}
          <Link href="/guide" className="text-blue-700 underline">
            /guide
          </Link>{' '}
          and follow the steps
        </li>
      </ul>
      <p className="mt-2 text-xs">
        <Link href="/status" className="text-blue-700 underline">
          System status
        </Link>
        {' · '}
        Google credentials are only needed for the old sheet path.
      </p>
    </div>
  );
}
