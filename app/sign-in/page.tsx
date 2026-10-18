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
    <main className="min-h-screen pb-24" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-md px-4 pt-10 space-y-6">
        <header className="text-center space-y-3 aid-rise">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
            style={{ background: 'var(--aid-emerald)' }}
            aria-hidden
          >
            M
          </div>
          <p className="aid-section-label">Staff only · للتشغيل</p>
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            تسجيل الدخول بحساب Google للوصول إلى لوحة التشغيل
          </p>
        </header>

        <section
          className="rounded-2xl border p-4 space-y-3 text-sm shadow-sm aid-rise"
          style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
          aria-label="Who this is for"
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--aid-emerald)' }}>
            Three doors · ثلاث بوابات
          </p>
          <ul className="space-y-2.5">
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--aid-emerald)' }}
              >
                1
              </span>
              <span>
                <span className="font-semibold">Beneficiaries</span>
                <span className="block text-xs" style={{ color: 'var(--aid-muted)' }}>
                  No login — submit & status only · بدون تسجيل
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--aid-emerald)' }}
              >
                2
              </span>
              <span>
                <span className="font-semibold">Employees</span>
                <span className="block text-xs" style={{ color: 'var(--aid-muted)' }}>
                  Company + ID + phone on{' '}
                  <Link href="/me" className="underline font-medium" style={{ color: 'var(--aid-emerald)' }}>
                    My profile
                  </Link>
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--aid-violet)' }}
              >
                3
              </span>
              <span>
                <span className="font-semibold">Staff & org operators</span>
                <span className="block text-xs" style={{ color: 'var(--aid-muted)' }}>
                  Google here · org-scoped data · بيانات المؤسسة
                </span>
              </span>
            </li>
          </ul>
        </section>

        {!neonOk && (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm space-y-3 shadow-sm"
            role="alert"
          >
            <p className="font-semibold text-amber-950">Google Auth not configured</p>
            <ol className="list-decimal list-inside space-y-1.5 text-amber-950/90 text-xs leading-relaxed">
              <li>
                Neon console → project → <strong>Auth</strong> → Enable
              </li>
              <li>
                Enable <strong>Google</strong> OAuth
              </li>
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
              <Link href="/?unlock=1" className="font-medium underline" style={{ color: 'var(--aid-emerald)' }}>
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
              platform staff, or invite org members from Admin. Platform admins can always access all
              orgs.
            </p>
          </div>
        )}

        {neonOk && (
          <div
            className="rounded-2xl border p-6 shadow-sm space-y-4 aid-rise"
            style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold">Continue with Google</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--aid-muted)' }}>
                Use a staff allowlist email
                {allowlist.length > 0 ? (
                  <span>
                    {' '}
                    ({allowlist.length} configured)
                  </span>
                ) : null}
                , or an invited organization member. Access is org-scoped after sign-in.
              </p>
            </div>
            <GoogleSignInButton nextPath={nextPath} />
            {searchParams.error && (
              <p
                className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
                role="alert"
              >
                {searchParams.error}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-sm space-x-3" style={{ color: 'var(--aid-muted)' }}>
          <Link href="/" className="hover:underline font-medium" style={{ color: 'var(--aid-emerald)' }}>
            Home
          </Link>
          <span aria-hidden>·</span>
          <Link href="/me" className="hover:underline">
            Employee profile
          </Link>
          <span aria-hidden>·</span>
          <Link href="/org/register" className="hover:underline">
            Register org
          </Link>
        </p>
      </div>
    </main>
  );
}
