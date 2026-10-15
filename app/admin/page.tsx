import Link from 'next/link';
import { Suspense } from 'react';
import { neonAuthConfigured } from '@/lib/auth/server';
import { getAllowedStaffEmails } from '@/lib/staffAccess';
import { featureFlagsStatus } from '@/lib/featureFlags';
import { AdminPanelClient } from './AdminPanelClient';
import { AdminSearch } from './AdminSearch';
import { LearningBootstrap } from './LearningBootstrap';
import { AuditLogPanel } from './AuditLogPanel';
import { OrgRequestsPanel } from './OrgRequestsPanel';
import { OrgsListPanel } from './OrgsListPanel';
import { OrgMembersPanel } from './OrgMembersPanel';

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
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <p className="aid-section-label">Staff only · Admin</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            لوحة التشغيل · تسجيل الدخول · الأدوار · الأعلام
          </p>
        </header>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">
            Monthly path · المسار الشهري
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {OPS_PATH.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-1 py-2 text-center hover:border-emerald-200 hover:bg-emerald-50/50 transition"
              >
                <div className="text-[10px] font-bold text-emerald-700">{s.n}</div>
                <div className="text-[10px] font-semibold text-slate-800 leading-tight">
                  {s.label}
                </div>
                <div className="text-[9px] text-slate-400" dir="rtl">
                  {s.ar}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <AdminSearch />

        <Suspense fallback={null}>
          <AdminPanelClient
            neonConfigured={neonOk}
            allowlistCount={allowlist.length}
            flags={flags}
          />
        </Suspense>

        <OrgsListPanel />

        <OrgMembersPanel />

        <OrgRequestsPanel />

        <AuditLogPanel />

        <LearningBootstrap />

        <p className="text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {' · '}
          <Link href="/sign-in" className="hover:underline">
            Sign in
          </Link>
          {' · '}
          <Link href="/admin/roles" className="hover:underline">
            Roles
          </Link>
          {' · '}
          <Link href="/org/register" className="hover:underline">
            Org register
          </Link>
        </p>
      </div>
    </main>
  );
}
