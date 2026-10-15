'use client';

import { useState } from 'react';
import Link from 'next/link';

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

export default function OrgRegisterPage() {
  const [org_name, setOrgName] = useState('');
  const [org_code, setOrgCode] = useState('');
  const [contact_name, setContactName] = useState('');
  const [contact_email, setContactEmail] = useState('');
  const [contact_phone, setContactPhone] = useState('');
  const [employee_count_est, setEmpCount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: string;
    message: string;
    org?: { code: string; name: string; slug: string };
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/orgs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name,
          org_code: org_code || undefined,
          contact_name,
          contact_email,
          contact_phone: contact_phone || undefined,
          employee_count_est: employee_count_est
            ? Number(employee_count_est)
            : undefined,
          message: message || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Registration failed');
      setResult({
        status: data.status,
        message: data.message,
        org: data.org
          ? { code: data.org.code, name: data.org.name, slug: data.org.slug }
          : undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-slate-900 pb-24">
      <div className="mx-auto max-w-lg px-4 pt-8 space-y-6">
        <header className="space-y-2 text-center sm:text-left">
          <p className="aid-section-label">For organizations · للمؤسسات</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Create organization account
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            سجّل مؤسستك لاستخدام منصة دعم العلاج الشهري
          </p>
          <p className="text-sm text-slate-500">
            Same platform used for chronic medicine support: intake, pharmacy routing,
            programs, refills, and employee self-service — under your organization name.
          </p>
        </header>

        {result ? (
          <div className="rounded-2xl border-2 border-emerald-200 bg-white/95 p-6 space-y-4 shadow-sm">
            <p className="text-lg font-bold text-emerald-900">
              {result.status === 'active'
                ? 'Organization ready · تم إنشاء المؤسسة'
                : 'Request submitted · تم إرسال الطلب'}
            </p>
            <p className="text-sm text-slate-700">{result.message}</p>
            {result.org && (
              <dl className="text-sm space-y-2 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-semibold">{result.org.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Org code</dt>
                  <dd className="font-mono font-semibold">{result.org.code}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Slug</dt>
                  <dd className="font-mono text-xs">{result.org.slug}</dd>
                </div>
              </dl>
            )}
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Next steps</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>
                  Ask the platform operator to add your contact email to{' '}
                  <code className="bg-slate-100 px-1 rounded">OPS_ALLOWED_EMAILS</code>{' '}
                  (or staff_roles) so you can sign in with Google.
                </li>
                <li>
                  Employees use <Link href="/me" className="text-emerald-800 font-semibold underline">My profile</Link>{' '}
                  with your company name + employee ID + phone.
                </li>
                <li>
                  Public intake stays at{' '}
                  <Link href="/intake" className="text-emerald-800 font-semibold underline">/intake</Link>.
                </li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/sign-in" className="aid-cta-primary px-4 py-2.5 text-sm">
                Staff sign-in
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Home
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur"
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Organization name * · اسم المؤسسة</span>
              <input
                required
                value={org_name}
                onChange={(e) => setOrgName(e.target.value)}
                className={field}
                placeholder="e.g. Acme Pharma Egypt"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Short code (optional)</span>
              <input
                value={org_code}
                onChange={(e) => setOrgCode(e.target.value)}
                className={field + ' font-mono'}
                placeholder="ACME"
                maxLength={24}
              />
              <span className="text-[11px] text-slate-400">
                Used as org_code on requests. Auto-generated if empty.
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Contact name * · المسؤول</span>
              <input
                required
                value={contact_name}
                onChange={(e) => setContactName(e.target.value)}
                className={field}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Work email * · البريد</span>
              <input
                required
                type="email"
                value={contact_email}
                onChange={(e) => setContactEmail(e.target.value)}
                className={field}
                placeholder="ops@company.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Phone · الهاتف</span>
              <input
                type="tel"
                value={contact_phone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={field}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Approx. employees on program</span>
              <input
                type="number"
                min={1}
                value={employee_count_est}
                onChange={(e) => setEmpCount(e.target.value)}
                className={field}
                placeholder="e.g. 200"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Message (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className={field}
                placeholder="Tell us about your chronic support program…"
              />
            </label>
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50"
            >
              {loading
                ? 'Creating… · جاري الإنشاء'
                : 'Create organization · إنشاء مؤسسة'}
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              By registering you agree to keep beneficiary health data confidential and use the
              platform only for authorized employee medical-aid programs.
            </p>
          </form>
        )}

        <p className="text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {' · '}
          <Link href="/guide" className="hover:underline">
            Guide
          </Link>
        </p>
      </div>
    </main>
  );
}
