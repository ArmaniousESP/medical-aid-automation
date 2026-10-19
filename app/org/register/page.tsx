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
    <main className="min-h-screen pb-24" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-lg px-4 pt-8 space-y-6">
        <header className="space-y-3 text-center aid-rise">
          <p className="aid-section-label">For organizations · للمؤسسات</p>
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Create organization account
          </h1>
          <p className="text-sm" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            سجّل مؤسستك لتشغيل دعم العلاج الشهري على المنصة
          </p>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--aid-muted)' }}>
            After review, your team runs intake, pharmacy, and programs — data stays
            scoped to your organization only.
          </p>
        </header>

        <div
          className="rounded-2xl border p-4 text-xs leading-relaxed shadow-sm"
          style={{
            background: 'var(--aid-surface)',
            borderColor: 'var(--aid-line)',
            color: 'var(--aid-muted)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--aid-ink)' }}>
            Your data boundary
          </p>
          Employees, requests, and pharmacy lists are filtered by org membership. Platform
          admins review registration; operators only see their own workspace.
        </div>

        <ol className="aid-rise grid grid-cols-3 gap-2 text-center text-[11px]">
          {[
            { n: '1', en: 'Register', ar: 'التسجيل' },
            { n: '2', en: 'Review', ar: 'المراجعة' },
            { n: '3', en: 'Operate', ar: 'التشغيل' },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border px-2 py-3 shadow-sm"
              style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
            >
              <span
                className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--aid-emerald)' }}
              >
                {s.n}
              </span>
              <p className="font-semibold">{s.en}</p>
              <p style={{ color: 'var(--aid-muted)' }} dir="rtl">
                {s.ar}
              </p>
            </li>
          ))}
        </ol>

        {result ? (
          <div
            className={`rounded-2xl border p-5 space-y-3 shadow-sm ${
              pending ? 'border-amber-200 bg-amber-50/95' : 'border-emerald-200 bg-emerald-50/95'
            }`}
          >
            <p className="font-semibold">{pending ? 'Pending review' : 'Ready'}</p>
            <p className="text-sm">{result.message}</p>
            {result.org && (
              <p className="text-xs font-mono">
                {result.org.code} · {result.org.slug}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/sign-in" className="font-semibold underline" style={{ color: 'var(--aid-emerald)' }}>
                Staff sign-in
              </Link>
              <Link href="/" className="underline" style={{ color: 'var(--aid-muted)' }}>
                Home
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border p-5 shadow-sm space-y-4"
            style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Organization name · اسم المؤسسة</span>
              <input
                required
                value={org_name}
                onChange={(e) => setOrgName(e.target.value)}
                className="aid-input"
                placeholder="e.g. Armanious Foundation"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Org code (optional) · كود اختياري</span>
              <input
                value={org_code}
                onChange={(e) => setOrgCode(e.target.value)}
                className="aid-input font-mono"
                placeholder="e.g. ESP"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Contact name · اسم المسؤول</span>
              <input
                required
                value={contact_name}
                onChange={(e) => setContactName(e.target.value)}
                className="aid-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Contact email · البريد</span>
              <input
                required
                type="email"
                value={contact_email}
                onChange={(e) => setContactEmail(e.target.value)}
                className="aid-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Phone · الهاتف</span>
              <input
                type="tel"
                value={contact_phone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="aid-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Est. employees · عدد تقريبي</span>
              <input
                type="number"
                min={1}
                value={employee_count_est}
                onChange={(e) => setEmpCount(e.target.value)}
                className="aid-input"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Message · رسالة</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="aid-input min-h-[88px]"
                placeholder="Tell us about your chronic medicine program…"
              />
            </label>
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit registration · إرسال الطلب'}
            </button>
          </form>
        )}

        <p className="text-center text-sm" style={{ color: 'var(--aid-muted)' }}>
          <Link href="/" className="font-medium hover:underline" style={{ color: 'var(--aid-emerald)' }}>
            Home
          </Link>
          {' · '}
          <Link href="/sign-in" className="hover:underline">
            Staff sign-in
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
