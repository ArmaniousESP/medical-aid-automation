'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicStepsBar } from '../PublicStepsBar';
import { loadLastRequestId, saveLastRequestId } from '@/lib/intakeDraft';

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
    if (qid) {
      setId(qid);
      return;
    }
    const last = loadLastRequestId();
    if (last) {
      setId(last);
      setFromDevice(true);
    }
  }, [search]);

  useEffect(() => {
    if (id && /^[0-9a-f-]{36}$/i.test(id.trim())) {
      void lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="space-y-4">
      {fromDevice && id && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-900 flex gap-2 items-start backdrop-blur">
          <span className="text-lg leading-none" aria-hidden>
            📱
          </span>
          <div>
            <p className="font-medium">Last request on this device</p>
            <p className="text-xs text-sky-800 mt-0.5" dir="rtl">
              آخر طلب محفوظ على هذا الجهاز — يُملأ تلقائياً
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => lookup(e)}
        className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">
            Request ID · رقم الطلب
          </span>
          <div className="flex gap-2">
            <input
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setFromDevice(false);
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={field + ' font-mono text-sm'}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={pasteId}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {pasted ? 'Pasted' : 'Paste'}
            </button>
          </div>
        </label>

        <details className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            Optional verification · تحقق اختياري
          </summary>
          <div className="mt-3 space-y-3 pb-1">
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
        </details>

        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50 active:scale-[0.99]"
        >
          {loading ? 'Looking up… · جاري البحث' : 'Check status · عرض الحالة'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm text-amber-950 space-y-3 backdrop-blur">
          <p className="font-semibold">We couldn't find that request</p>
          <p className="text-xs text-amber-900/80" dir="rtl">
            لم نعثر على الطلب — تأكد من رقم الطلب أو قدّم طلباً جديداً
          </p>
          <ul className="text-xs list-disc list-inside space-y-1 text-amber-900/90">
            <li>Copy the ID exactly from the success screen</li>
            <li>Try optional phone / employee ID verification</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/intake" className="aid-cta-primary px-4 py-2.5 text-xs">
              Submit a new request
            </Link>
            <Link
              href="/guide"
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold"
            >
              Help guide
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

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500 text-xs">Patient</dt>
              <dd className="font-medium mt-0.5">{String(data.patient_name || '—')}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500 text-xs">Employee</dt>
              <dd className="font-medium mt-0.5">{String(data.emp_name || '—')}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 col-span-2">
              <dt className="text-slate-500 text-xs">Submitted</dt>
              <dd className="font-medium mt-0.5">
                {data.created_at
                  ? new Date(String(data.created_at)).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>

          {Array.isArray(data.meds) && (data.meds as unknown[]).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Medicines</p>
              <ul className="space-y-1.5">
                {(data.meds as { name?: string; qty?: number }[]).map((m, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm flex justify-between gap-2"
                  >
                    <span>{m.name || '—'}</span>
                    <span className="text-slate-500 shrink-0">×{m.qty ?? 1}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={copyLink}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-900"
            >
              {copied ? 'Link copied ✓' : 'Copy status link · نسخ الرابط'}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Bookmark this page or save the link to check again later
            </p>
          </div>
        </div>
      )}

      {!data && !error && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center space-y-3 backdrop-blur">
          <p className="text-2xl" aria-hidden>
            🔎
          </p>
          <p className="text-sm font-medium text-slate-700">Looking for a request?</p>
          <p className="text-xs text-slate-500">
            Paste your Request ID above, or start a new submission.
          </p>
          <p className="text-xs text-slate-500" dir="rtl">
            الصق رقم الطلب أعلاه، أو ابدأ طلباً جديداً
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link href="/intake" className="aid-cta-primary inline-flex px-5 py-2.5 text-sm">
              Submit a request →
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestStatusPage() {
  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-24 md:pb-10">
      <div className="mx-auto max-w-md space-y-5">
        <PublicStepsBar active="status" />
        <header className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            My request status
          </h1>
          <p className="text-base text-slate-600" dir="rtl">
            حالة الطلب
          </p>
        </header>
        <Suspense
          fallback={
            <p className="text-sm text-slate-500 text-center py-8 animate-pulse">
              Loading status… · جاري التحميل
            </p>
          }
        >
          <StatusForm />
        </Suspense>
        <p className="text-center text-sm text-slate-500 space-x-2">
          <Link href="/intake" className="text-emerald-700 font-medium hover:underline">
            ← Submit
          </Link>
          <span>·</span>
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>·</span>
          <Link href="/guide" className="hover:underline">
            Help
          </Link>
        </p>
      </div>
    </main>
  );
}
