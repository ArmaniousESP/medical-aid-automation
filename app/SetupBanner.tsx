import Link from 'next/link';

/**
 * Soft banner: platform needs Neon; short path reminder for everyone.
 */
export function SetupBanner() {
  const hasDb = !!process.env.DATABASE_URL;

  if (!hasDb) {
    return (
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
        <div className="font-semibold text-amber-900">Setup required</div>
        <p className="mt-1 text-slate-700">
          Add <code className="bg-white/80 px-1 rounded text-xs">DATABASE_URL</code>{' '}
          (Neon pooler) on Vercel, then Redeploy.
        </p>
        <p className="mt-2 text-xs">
          <Link href="/status" className="text-blue-700 underline">
            System status
          </Link>
          {' · '}
          <Link href="/guide" className="text-violet-700 underline">
            How to use
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
      <span>
        <span className="font-medium">You:</span> 1 Submit → 2 Status
        <span className="text-emerald-700/70 mx-1.5">·</span>
        <span className="font-medium">Staff:</span> Queue → Claims → Pharmacy
      </span>
      <Link href="/guide" className="text-violet-700 font-medium hover:underline shrink-0">
        Guide →
      </Link>
    </div>
  );
}
