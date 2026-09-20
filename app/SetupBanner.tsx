/**
 * Server-rendered banner when critical Vercel env vars are missing.
 */
export function SetupBanner() {
  const hasDb = !!process.env.DATABASE_URL;
  const hasGoogle = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );

  if (hasDb && hasGoogle) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
      <div className="font-semibold text-amber-900">إعداد مطلوب على Vercel</div>
      <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700">
        {!hasDb && (
          <li>
            أضف <code className="bg-white/80 px-1 rounded text-xs">DATABASE_URL</code> (Neon
            pooler) ثم Redeploy — بدونها البرامج والصرف لا يعملان.
          </li>
        )}
        {!hasGoogle && (
          <li>
            أضف <code className="bg-white/80 px-1 rounded text-xs">GOOGLE_*</code> +{' '}
            <code className="bg-white/80 px-1 rounded text-xs">GOOGLE_SHEET_ID</code> لمعالجة
            الاستمارة من الشيت.
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-slate-600">
        المسار: Vercel → Project → Settings → Environment Variables → Production → Save →
        Deployments → Redeploy. التفاصيل:{' '}
        <a href="/status" className="text-blue-700 underline">
          /status
        </a>
      </p>
    </div>
  );
}
