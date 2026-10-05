import Link from 'next/link';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { GoogleSignInButton } from './GoogleSignInButton';

export const dynamic = 'force-dynamic';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();
  const nextPath =
    searchParams.next && searchParams.next.startsWith('/')
      ? searchParams.next
      : '/';

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Staff sign-in</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            دخول التشغيل عبر Google (Neon Auth)
          </p>
        </header>

        {!neonOk && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm space-y-2">
            <p className="font-medium text-amber-950">Neon Auth not configured</p>
            <ol className="list-decimal list-inside text-xs text-amber-900 space-y-1">
              <li>Neon Console → your branch → <strong>Auth</strong> → Enable</li>
              <li>Enable <strong>Google</strong> OAuth (dev shared keys or your client ID)</li>
              <li>
                Vercel env:{' '}
                <code className="bg-white/80 px-1 rounded">NEON_AUTH_BASE_URL</code>,{' '}
                <code className="bg-white/80 px-1 rounded">NEON_AUTH_COOKIE_SECRET</code>{' '}
                (32+ chars),{' '}
                <code className="bg-white/80 px-1 rounded">NEXT_PUBLIC_NEON_AUTH_URL</code>{' '}
                (same as base URL)
              </li>
              <li>
                <code className="bg-white/80 px-1 rounded">OPS_ALLOWED_EMAILS</code> =
                staff@your.org,...
              </li>
              <li>Redeploy</li>
            </ol>
            <p className="text-xs">
              Fallback:{' '}
              <Link href="/?unlock=1" className="text-violet-700 underline">
                PROCESS_SECRET unlock on Home
              </Link>
            </p>
          </div>
        )}

        {neonOk && allowlist.length === 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-medium">Set OPS_ALLOWED_EMAILS</p>
            <p className="text-xs mt-1 text-amber-900">
              Comma-separated Google emails allowed for ops. Without this list, no
              Google account can open staff pages.
            </p>
          </div>
        )}

        {neonOk && allowlist.length > 0 && (
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
            <p className="text-sm text-slate-600">
              Sign in with a Google account on the staff allowlist ({allowlist.length}{' '}
              email{allowlist.length === 1 ? '' : 's'}).
            </p>
            <GoogleSignInButton nextPath={nextPath} />
            {searchParams.error && (
              <p className="text-xs text-red-600">{searchParams.error}</p>
            )}
          </div>
        )}

        <div className="text-center text-sm space-x-3">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/?unlock=1" className="text-slate-600 hover:underline">
            Secret unlock
          </Link>
          <Link href="/status" className="text-slate-600 hover:underline">
            Status
          </Link>
        </div>
      </div>
    </main>
  );
}
