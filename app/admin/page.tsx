import Link from 'next/link';
import { Suspense } from 'react';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { featureFlagsStatus } from '@/lib/featureFlags';
import { AdminPanelClient } from './AdminPanelClient';
import { AdminSearch } from './AdminSearch';
import { LearningBootstrap } from './LearningBootstrap';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const neonOk = neonAuthConfigured();
  const allowlist = getAllowedStaffEmails();
  const flags = featureFlagsStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Staff only
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin</h1>
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
              <strong>{process.env.PROCESS_SECRET ? 'set' : 'not set'}</strong>
            </li>
          </ul>
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
          <Link
            href="/guide#for-staff"
            className="hover:text-violet-700 hover:underline"
          >
            Staff guide
          </Link>
        </div>
      </div>
    </main>
  );
}
