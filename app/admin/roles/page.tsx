import Link from 'next/link';
import { RolesManager } from './RolesManager';

export const dynamic = 'force-dynamic';

export default function AdminRolesPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Admin
          </p>
          <h1 className="text-2xl font-semibold">Role management</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            إدارة أدوار التشغيل · admin / operator / viewer
          </p>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">Roles</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>admin</strong> — manage roles + full ops
            </li>
            <li>
              <strong>operator</strong> — Queue → Pharmacy → Refills (no role UI)
            </li>
            <li>
              <strong>viewer</strong> — reserved (read-only later)
            </li>
          </ul>
          <p>
            Super-admins via env:{' '}
            <code className="bg-slate-100 px-1 rounded">OPS_ADMIN_EMAILS</code>
          </p>
          <p>
            Google access still needs email on{' '}
            <code className="bg-slate-100 px-1 rounded">OPS_ALLOWED_EMAILS</code>{' '}
            <em>or</em> an active row here (operators synced from allowlist).
          </p>
        </div>

        <RolesManager />

        <div className="flex flex-wrap gap-3 text-sm justify-center">
          <Link href="/admin" className="text-violet-700 hover:underline">
            ← Admin panel
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
