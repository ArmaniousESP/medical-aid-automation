import Link from 'next/link';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { GoogleSignInButton } from './GoogleSignInButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Staff sign-in',
  description: 'Sign in with Google to access Medical Aid operations.',
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();
  const nextPath = searchParams.next || '/admin';

  return (
    <main className="min-h-screen text-slate-900 pb-24">
      <div className="mx-auto max-w-md px-4 pt-10 space-y-6">
        <header className="text-center space-y-3 aid-rise">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg"
            style={{
              background:
                'linear-gradient(135deg, #059669, #0d9488 55%, #6d28d9)',
            }}
            aria-hidden
          >
            MA
          </div>
          <p className="aid-section-label">Staff only · للتشغيل</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            تسجيل الدخول بحساب Google للوصول إلى لوحة التشغيل
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 text-center text-[11px] aid-rise">
          <div className="rounded-2xl border border-white/90 bg-white/85 px-2 py-3 shadow-sm backdrop-blur">
            <p className="font-semibold text-slate-800">Org-scoped data</p>
            <p className="text-slate-500 mt-0.5" dir="rtl">
              بيانات مؤسستك فقط
            </p>
          </div>
          <div className="rounded-2xl border border-white/90 bg-white/85 px-2 py-3 shadow-sm backdrop-blur">
            <p className="font-semibold text-slate-800">Google secure</p>
            <p className="text-slate-500 mt-0.5" dir="rtl">
              دخول آمن
            </p>
          </div>
        </div>

        {!neonOk && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm space-y-3 shadow-sm">
            <p className="font-semibold text-amber-950">Google Auth not configured</p>
            <ol className="list-decimal list-inside space-y-1.5 text-amber-950/90 text-xs leading-relaxed">
              <li>
                Neon console → project → <strong>Auth</strong> → Enable
              </li>
              <li>Enable <strong>Google</strong> OAuth</li>
              <li>
                Vercel:{' '}
                <code className="bg-white/80 px-1 rounded">NEON_AUTH_BASE_URL</code>,{' '}
                <code className="bg-white/80 px-1 rounded">NEON_AUTH_COOKIE_SECRET</code>,{' '}
                <code className="bg-white/80 px-1 rounded">NEXT_PUBLIC_NEON_AUTH_URL</code>
              </li>
              <li>
                <code className="bg-white/80 px-1 rounded">OPS_ALLOWED_EMAILS</code> or org membership
              </li>
              <li>Redeploy</li>
            </ol>
            <p className="text-xs">
              Fallback:{' '}
              <Link href="/?unlock=1" className="text-violet-700 font-medium underline">
                PROCESS_SECRET unlock on Home
              </Link>
            </p>
          </div>
        )}

        {neonOk && allowlist.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-4 text-sm shadow-sm">
            <p className="font-semibold text-amber-950">Allowlist or org membership required</p>
            <p className="text-xs mt-1.5 text-amber-900 leading-relaxed">
              Set <code className="bg-white/80 px-1 rounded">OPS_ALLOWED_EMAILS</code> for
              platform staff, or invite org members from Admin. Platform admins can always access all orgs.
            </p>
          </div>
        )}

        {neonOk && allowlist.length > 0 && (
          <div className="rounded-2xl border border-white/90 bg-white/95 p-6 shadow-sm space-y-4 backdrop-blur aid-rise">
            <p className="text-sm text-slate-600 leading-relaxed">
              Sign in with a Google account on the staff allowlist
              <span className="text-slate-400">
                {' '}
                ({allowlist.length} email{allowlist.length === 1 ? '' : 's'})
              </span>
              , or an invited organization member.
            </p>
            <GoogleSignInButton nextPath={nextPath} />
            {searchParams.error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {searchParams.error}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-sm text-slate-500 space-x-3">
          <Link href="/" className="text-emerald-700 font-medium hover:underline">
            Home
          </Link>
          <Link href="/org/register" className="hover:underline">
            Register org
          </Link>
          <Link href="/?unlock=1" className="hover:underline">
            Secret unlock
          </Link>
        </p>
      </div>
    </main>
  );
}
