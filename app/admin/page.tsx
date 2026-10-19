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
    <main className="min-h-screen p-4 sm:p-6 pb-28 md:pb-16" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1 text-center sm:text-left">
          <p className="aid-section-label">Staff only · Admin</p>
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            لوحة التشغيل · تسجيل الدخول · الأدوار · الأعلام
          </p>
        </header>

        <div
          className="rounded-2xl border p-3 shadow-sm"
          style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2 px-1"
            style={{ color: 'var(--aid-muted)' }}
          >
            Monthly path · المسار الشهري
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {OPS_PATH.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border px-1 py-2 text-center transition hover:opacity-90"
                style={{
                  borderColor: 'var(--aid-line)',
                  background: 'var(--aid-paper)',
                }}
              >
                <div className="text-[10px] font-bold" style={{ color: 'var(--aid-emerald)' }}>
                  {s.n}
                </div>
                <div className="text-[10px] font-semibold leading-tight">{s.label}</div>
                <div className="text-[9px]" style={{ color: 'var(--aid-muted)' }} dir="rtl">
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

        <p className="text-center text-xs" style={{ color: 'var(--aid-muted)' }}>
          <Link href="/" className="hover:underline font-medium" style={{ color: 'var(--aid-emerald)' }}>
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
