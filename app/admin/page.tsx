import Link from 'next/link';
import { Suspense } from 'react';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { AdminPanelClient } from './AdminPanelClient';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Staff only
          </p>
          <h1 className="text-2xl font-semibold">Admin panel</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            لوحة التشغيل · Google Auth · إدارة الأدوار
          </p>
        </header>

        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p className="font-medium">Access status</p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>
              Neon Auth:{' '}
              <strong className={neonOk ? 'text-emerald-700' : 'text-amber-700'}>
                {neonOk ? 'configured' : 'not set'}
              </strong>
            </li>
            <li>
              OPS_ALLOWED_EMAILS:{' '}
              <strong className={allowlist.length ? 'text-emerald-700' : 'text-amber-700'}>
                {allowlist.length ? `${allowlist.length} email(s)` : 'empty'}
              </strong>
            </li>
            <li>
              PROCESS_SECRET:{' '}
              <strong>
                {process.env.PROCESS_SECRET ? 'set (fallback)' : 'not set'}
              </strong>
            </li>
          </ul>
        </div>

        <Link
          href="/admin/roles"
          className="flex items-center justify-between rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950 hover:bg-violet-100"
        >
          <span>Role management</span>
          <span className="text-xs font-normal text-violet-700">admin / operator / viewer →</span>
        </Link>

        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <AdminPanelClient />
        </Suspense>

        <div className="flex flex-wrap gap-3 text-sm justify-center">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/admin/roles" className="text-violet-700 hover:underline">
            Roles
          </Link>
          <Link href="/status" className="text-slate-600 hover:underline">
            Status
          </Link>
        </div>
      </div>
    </main>
  );
}
