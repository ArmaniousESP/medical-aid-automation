'use client';

import { useState } from 'react';
import Link from 'next/link';

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

  const pending = result?.status === 'pending';

  return (
    <main className="min-h-screen text-slate-900 pb-24">
      <div className="mx-auto max-w-lg px-4 pt-8 space-y-6">
        <header className="space-y-3 text-center aid-rise">
          <p className="aid-section-label">For organizations · للمؤسسات</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Create organization account
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            سجّل مؤسستك لتشغيل دعم العلاج الشهري على المنصة
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            After review, your team can run intake, pharmacy, programs, and employee
            self-service — scoped to your organization only.
          </p>
        </header>

        <ol className="aid-rise grid grid-cols-3 gap-2 text-center text-[11px]">
          {[
            { n: '1', en: 'Register', ar: 'التسجيل' },
            { n: '2', en: 'Approval', ar: 'الموافقة' },
            { n: '3', en: 'Invite staff', ar: 'دعوة الفريق' },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-white/90 bg-white/85 px-2 py-3 shadow-sm backdrop-blur"
            >
              <span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-800">
                {s.n}
              </span>
              <p className="font-semibold text-slate-800">{s.en}</p>
              <p className="text-slate-500" dir="rtl">
                {s.ar}
              </p>
            </li>
          ))}
        </ol>

        {result ? (
          <section
            className={
              pending
                ? 'rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 space-y-3 shadow-sm'
                : 'rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 space-y-3 shadow-sm'
            }
          >
            <p
              className={
                pending
                  ? 'aid-badge-warn'
                  : 'aid-badge-success'
              }
            >
              {pending ? 'Pending review · بانتظار المراجعة' : 'Active · مفعّل'}
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              {pending ? 'Request received' : 'Organization ready'}
            </h2>
            <p className="text-sm text-slate-600">{result.message}</p>
            {result.org && (
              <p className="text-sm font-mono text-slate-700">
                {result.org.name} · <span className="font-semibold">{result.org.code}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/sign-in"
                className="aid-cta-primary px-4 py-2.5 text-sm"
              >
                Staff sign-in
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Home
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/90 bg-white/90 p-5 sm:p-6 space-y-4 shadow-sm backdrop-blur aid-rise"
          >
            <label className="block">
              <span className="aid-label">Organization name · اسم المؤسسة</span>
              <input
                required
                value={org_name}
                onChange={(e) => setOrgName(e.target.value)}
                className="aid-input"
                placeholder="e.g. Armanious Group"
                autoComplete="organization"
              />
            </label>

            <label className="block">
              <span className="aid-label">
                Short code <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={org_code}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                className="aid-input font-mono uppercase"
                placeholder="ARMANIOUS"
                maxLength={24}
              />
              <span className="aid-hint">Used for data isolation · رمز العزل بين المؤسسات</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="aid-label">Contact name · المسؤول</span>
                <input
                  required
                  value={contact_name}
                  onChange={(e) => setContactName(e.target.value)}
                  className="aid-input"
                  autoComplete="name"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="aid-label">Work email · البريد</span>
                <input
                  required
                  type="email"
                  value={contact_email}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="aid-input"
                  autoComplete="email"
                  placeholder="you@company.com"
                />
                <span className="aid-hint">
                  Use the Google account you will sign in with
                </span>
              </label>
              <label className="block">
                <span className="aid-label">Phone · الهاتف</span>
                <input
                  value={contact_phone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="aid-input"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>
              <label className="block">
                <span className="aid-label">Employees (est.)</span>
                <input
                  value={employee_count_est}
                  onChange={(e) => setEmpCount(e.target.value)}
                  className="aid-input"
                  inputMode="numeric"
                  placeholder="e.g. 200"
                />
              </label>
            </div>

            <label className="block">
              <span className="aid-label">
                Message <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="aid-input resize-y min-h-[5rem]"
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
                ? 'Submitting… · جاري الإرسال'
                : 'Submit for approval · إرسال للموافقة'}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              By registering you agree to keep beneficiary health data confidential and use
              the platform only for authorized employee medical-aid programs.
            </p>
          </form>
        )}

        <p className="text-center text-xs text-slate-400 space-x-2 pb-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>·</span>
          <Link href="/sign-in" className="hover:underline">
            Sign in
          </Link>
          <span>·</span>
          <Link href="/guide" className="hover:underline">
            Guide
          </Link>
        </p>
      </div>
    </main>
  );
}
