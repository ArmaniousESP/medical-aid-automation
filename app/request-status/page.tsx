'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicStepsBar } from '../PublicStepsBar';
import { loadLastRequestId, loadProfile, saveLastRequestId } from '@/lib/intakeDraft';

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

function StatusForm() {
  const search = useSearchParams();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fromDevice, setFromDevice] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const qid = search?.get('id');
    if (qid) setId(qid);
    else {
      const last = loadLastRequestId();
      if (last) {
        setId(last);
        setFromDevice(true);
      }
    }
    // Pre-fill verification from /me profile saved on this device
    const profile = loadProfile();
    if (profile) {
      if (profile.phone) setPhone(profile.phone);
      if (profile.emp_id) setEmpId(profile.emp_id);
    }
    const qp = search?.get('phone');
    const qe = search?.get('emp_id');
    if (qp) setPhone(qp);
    if (qe) setEmpId(qe);
  }, [search]);

  useEffect(() => {
    if (id && /^[0-9a-f-]{36}$/i.test(id.trim())) {
      void lookup();
    }
    // Re-check when verification fields arrive from profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, phone, empId]);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const q = new URLSearchParams({ id: id.trim() });
      if (phone.trim()) q.set('phone', phone.trim());
      if (empId.trim()) q.set('emp_id', empId.trim());
      const res = await fetch(`/api/request-status?${q}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Not found');
      setData(json);
      saveLastRequestId(id.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function pasteId() {
    try {
      const t = await navigator.clipboard.readText();
      if (t?.trim()) {
        setId(t.trim());
        setFromDevice(false);
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch {
      setError('Could not read clipboard — paste manually');
    }
  }

  async function copyLink() {
    if (!id.trim()) return;
    const url = `${window.location.origin}/request-status?id=${encodeURIComponent(id.trim())}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy link');
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={lookup} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">
            Request ID · رقم الطلب
          </span>
          <div className="flex gap-2">
            <input
              required
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setFromDevice(false);
              }}
              className={field + ' font-mono text-sm'}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={pasteId}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {pasted ? '✓' : 'Paste'}
            </button>
          </div>
          {fromDevice && (
            <p className="text-[11px] text-emerald-700">
              Using last request saved on this device
            </p>
          )}
        </label>

        <details className="text-sm text-slate-600" open={!!(phone || empId)}>
          <summary className="cursor-pointer font-medium text-slate-700">
            Optional verification · تحقق اختياري
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs">Phone · الهاتف</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={field + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-xs">Employee ID · الرقم الوظيفي</span>
              <input
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className={field + ' mt-1'}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Enter the same phone or employee ID used on the request to unlock full names and medicine list.
          </p>
        </details>

        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50 active:scale-[0.99]"
        >
          {loading ? 'Looking up… · جاري البحث' : 'Check status · فحص الحالة'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm text-amber-950 space-y-3 backdrop-blur">
          <p className="font-semibold">We couldn&apos;t find that request</p>
          <p className="text-xs text-amber-900/80" dir="rtl">
            لم نعثر على الطلب — تأكد من رقم الطلب أو قدّم طلباً جديداً
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/intake" className="aid-cta-primary px-4 py-2.5 text-xs">
              Submit a new request
            </Link>
            <Link href="/me" className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold">
              My profile · ملفي
            </Link>
          </div>
        </div>
      )}

      {data && (
        <div className="rounded-2xl border-2 border-emerald-200/80 bg-white/95 p-5 shadow-lg shadow-emerald-600/10 space-y-5 backdrop-blur">
          <div className="text-center space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
              Current status · الحالة الحالية
            </p>
            <p className="text-2xl font-bold text-emerald-950">
              {String(data.status_label_ar || data.status || '')}
            </p>
            <p className="text-sm text-emerald-800">
              {String(data.status_label_en || '')}
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500 text-xs">Patient · المريض</dt>
              <dd className="font-medium mt-0.5 break-words">
                {String(
                  data.verified
                    ? data.patient_name || data.patient_name_masked
                    : data.patient_name_masked || data.patient_name || '—'
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500 text-xs">Employee · الموظف</dt>
              <dd className="font-medium mt-0.5 break-words">
                {String(
                  data.verified
                    ? data.emp_name || data.emp_name_masked
                    : data.emp_name_masked || data.emp_name || '—'
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
              <dt className="text-slate-500 text-xs">Submitted</dt>
              <dd className="font-medium mt-0.5">
                {data.created_at
                  ? new Date(String(data.created_at)).toLocaleString()
                  : '—'}
              </dd>
            </div>
            {data.med_count != null && Number(data.med_count) > 0 && (
              <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500 text-xs">Medicines · الأدوية</dt>
                <dd className="font-medium mt-0.5">
                  {String(data.med_count)} item(s) on this request
                </dd>
              </div>
            )}
            {data.stage_hint ? (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-600">{String(data.stage_hint)}</p>
              </div>
            ) : null}
            {data.verified ? (
              <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Verified view · عرض مُتحقَّق — full names shown (phone or employee ID matched).
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                Names are masked for privacy. Open <strong>Optional verification</strong> and enter your phone or employee ID, or use{' '}
                <a href="/me" className="font-semibold underline">My profile</a> to see all your past requests.
              </div>
            )}
            {!!data.verified && Array.isArray(data.meds) && (data.meds as { name?: string; qty?: number }[]).length > 0 && (
              <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500 text-xs mb-1">Medicines · الأدوية</dt>
                <ul className="text-sm space-y-1">
                  {(data.meds as { name?: string; qty?: number }[]).map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-400 shrink-0">{m.qty || 1}×</span>
                      <span className="min-w-0 break-words">{m.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </dl>

          <button
            type="button"
            onClick={copyLink}
            className="w-full rounded-full border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            {copied ? 'Copied · تم النسخ' : 'Copy status link · نسخ الرابط'}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Bookmark this page or save the link to check again later
          </p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        <Link href="/intake" className="hover:underline">
          Submit another · طلب جديد
        </Link>
        {' · '}
        <Link href="/me" className="hover:underline">
          My profile · ملفي
        </Link>
      </p>
    </div>
  );
}

export default function RequestStatusPage() {
  return (
    <main className="min-h-screen text-slate-900 pb-24">
      <div className="mx-auto max-w-md px-4 pt-6 space-y-5">
        <PublicStepsBar active="status" />
        <header className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Request status
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            متابعة حالة طلب العلاج الشهري
          </p>
        </header>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <StatusForm />
        </Suspense>
      </div>
    </main>
  );
}
