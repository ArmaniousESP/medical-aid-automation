import Link from 'next/link';
import { Suspense } from 'react';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { featureFlagsStatus } from '@/lib/featureFlags';
import { AdminPanelClient } from './AdminPanelClient';
import { AdminSearch } from './AdminSearch';
import { LearningBootstrap } from './LearningBootstrap';

export const dynamic = 'force-dynamic';

const OPS_PATH = [
  { href: '/intake-ops', n: '1', label: 'Queue', ar: 'الطابور' },
  { href: '/claims', n: '2', label: 'Claims', ar: 'المطالبات' },
  { href: '/pharmacy', n: '3', label: 'Pharmacy', ar: 'الصيدلية' },
  { href: '/programs', n: '4', label: 'Programs', ar: 'البرامج' },
  { href: '/refills', n: '5', label: 'Refills', ar: 'الصرف' },
] as const;

export default function AdminPage() {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();
  const flags = featureFlagsStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Staff only · Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            لوحة التشغيل · تسجيل الدخول · الأدوار · الأعلام
          </p>
        </header>

        {/* Ops path chips */}
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
            Monthly path · المسار الشهري
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {OPS_PATH.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-1 py-2.5 text-center hover:border-violet-300 hover:bg-violet-50 transition"
              >
                <span className="text-[10px] font-bold text-violet-700">{s.n}</span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-800 leading-tight">
                  {s.label}
                </span>
                <span className="text-[9px] text-slate-400 leading-tight" dir="rtl">
                  {s.ar}
                </span>
              </Link>
            ))}
          </div>
        </div>

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
              <strong>{process.env.PROCESS_SECRET ? 'set' : 'not set'}</strong>
            </li>
          </ul>
          <Link
            href="/admin/roles"
            className="mt-2 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-900 hover:bg-violet-100"
          >
            <span>Role management · إدارة الأدوار</span>
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p className="font-semibold text-slate-800">Management feature flags</p>
          <p className="text-[11px] text-slate-500">
            Off by default until approved. Toggle in Vercel → Environment Variables.
          </p>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex justify-between gap-2 items-start">
              <span>
                WHO needs assessment
                <span className="block text-[10px] text-slate-400">
                  {flags.who_assessment.env}
                </span>
              </span>
              <strong
                className={
                  flags.who_assessment.enabled ? 'text-emerald-700' : 'text-amber-700'
                }
              >
                {flags.who_assessment.enabled ? 'ON' : 'OFF'}
              </strong>
            </li>
            <li className="flex justify-between gap-2 items-start">
              <span>
                AI adherence coach
                <span className="block text-[10px] text-slate-400">
                  {flags.ai_adherence_coach.env}
                  {flags.ai_adherence_coach.llm ? ' · LLM key present' : ' · rules only'}
                </span>
              </span>
              <strong
                className={
                  flags.ai_adherence_coach.enabled
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }
              >
                {flags.ai_adherence_coach.enabled ? 'ON' : 'OFF'}
              </strong>
            </li>
          </ul>
        </div>

        <Suspense fallback={<p className="text-sm text-slate-500">Loading sign-in…</p>}>
          <AdminPanelClient />
        </Suspense>

        <LearningBootstrap />

        <AdminSearch />

        <div className="flex flex-wrap gap-3 text-sm justify-center text-slate-500">
          <Link href="/" className="hover:text-slate-800 hover:underline">
            Home
          </Link>
          <Link href="/status" className="hover:text-slate-800 hover:underline">
            System status
          </Link>
          <Link href="/notifications" className="hover:text-slate-800 hover:underline">
            Notifications
          </Link>
          <Link
            href="/guide#for-staff"
            className="hover:text-violet-700 hover:underline"
          >
            Staff guide
          </Link>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-xl flex gap-2">
          <Link
            href="/admin/roles"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Roles
          </Link>
          <Link
            href="/intake-ops"
            className="flex-1 rounded-xl bg-violet-700 py-3 text-center text-sm font-semibold text-white"
          >
            Queue →
          </Link>
        </div>
      </div>
    </main>
  );
}
