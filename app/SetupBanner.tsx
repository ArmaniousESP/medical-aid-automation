import Link from 'next/link';

/** Soft path reminder when DB is ready; strong setup alert when not. */
export function SetupBanner() {
  const hasDb = !!process.env.DATABASE_URL;

  if (!hasDb) {
    return (
      <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
        <p className="font-semibold text-amber-950">Setup required</p>
        <p className="mt-1 text-slate-700">
          Add{' '}
          <code className="bg-white/90 px-1.5 py-0.5 rounded text-xs font-mono">
            DATABASE_URL
          </code>{' '}
          (Neon) on Vercel, then Redeploy.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
          <Link href="/status" className="text-blue-700 underline">
            System status
          </Link>
          <Link href="/guide" className="text-violet-700 underline">
            How to use
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 hidden sm:flex rounded-xl border border-slate-100 bg-white/80 px-3 py-1.5 text-[11px] text-slate-500 items-center justify-between gap-2">
      <span>
        <span className="font-semibold text-emerald-800">You</span> Submit → Status
        <span className="mx-1.5 text-slate-300">|</span>
        <span className="font-semibold text-violet-800">Staff</span> Queue → … → Refills
      </span>
      <Link
        href="/guide"
        className="text-violet-700 font-semibold hover:underline shrink-0"
      >
        Guide
      </Link>
    </div>
  );
}
