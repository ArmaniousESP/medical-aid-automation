import Link from 'next/link';
import { Suspense } from 'react';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { AdminPanelClient } from './AdminPanelClient';

export const dynamic = 'force-dynamic';

const PATH = [
  { n: 1, label: 'Queue', href: '/intake-ops', hint: 'Process intake' },
  { n: 2, label: 'Claims', href: '/claims', hint: 'Submit drafts' },
  { n: 3, label: 'Pharmacy', href: '/pharmacy', hint: 'EVA CSV' },
  { n: 4, label: 'Programs', href: '/programs', hint: 'Enrollments' },
  { n: 5, label: 'Refills', href: '/refills', hint: 'Monthly cycles' },
] as const;

export default function AdminPage() {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Staff only
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Admin
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            لوحة التشغيل · تسجيل الدخول · الأدوار
          </p>
        </header>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p className="font-semibold text-slate-800">Access status</p>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex justify-between gap-2">
              <span>Neon Google Auth</span>
              <strong className={neonOk ? 'text-emerald-700' : 'text-amber-700'}>
                {neonOk ? 'configured' : 'not set'}
              </strong>
            </li>
            <li className="flex justify-between gap-2">
              <span>Allowed emails</span>
              <strong className={allowlist.length ? 'text-emerald-700' : 'text-amber-700'}>
                {allowlist.length ? `${allowlist.length}` : 'empty'}
              </strong>
            </li>
            <li className="flex justify-between gap-2">
              <span>PROCESS_SECRET</span>
              <strong>
                {process.env.PROCESS_SECRET ? 'set' : 'not set'}
              </strong>
            </li>
          </ul>
        </div>

        <Suspense fallback={<p className="text-sm text-slate-500">Loading sign-in…</p>}>
          <AdminPanelClient />
        </Suspense>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">
            Start work · ابدأ التشغيل
          </h2>
          <div className="grid gap-2">
            {PATH.map((s) => (
              <Link
                key={s.n}
                href={s.href}
                className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm hover:border-violet-300 hover:bg-violet-50/50 transition"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
                  {s.n}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-slate-900">{s.label}</span>
                  <span className="text-xs text-slate-500">{s.hint}</span>
                </span>
                <span className="text-slate-300">→</span>
              </Link>
            ))}
          </div>
        </section>

        <Link
          href="/admin/roles"
          className="flex items-center justify-between rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3.5 text-sm font-semibold text-violet-950 hover:bg-violet-100"
        >
          <span>Role management</span>
          <span className="text-xs font-normal text-violet-700">
            admin · operator · viewer →
          </span>
        </Link>

        <div className="flex flex-wrap gap-3 text-sm justify-center text-slate-500">
          <Link href="/" className="hover:text-slate-800 hover:underline">
            Home
          </Link>
          <Link href="/status" className="hover:text-slate-800 hover:underline">
            System status
          </Link>
          <Link href="/guide#for-staff" className="hover:text-violet-700 hover:underline">
            Staff guide
          </Link>
        </div>
      </div>
    </main>
  );
}
