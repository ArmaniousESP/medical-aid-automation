'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicStepsBar } from '../PublicStepsBar';
import { loadLastRequestId, saveLastRequestId } from '@/lib/intakeDraft';

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none';

/** Map backend status → timeline step 0..3 */
function stageIndex(status: string | undefined): number {
  const s = (status || '').toLowerCase();
  if (!s) return 0;
  if (/dispens|complet|deliver|done|closed/.test(s)) return 3;
  if (/pharmac|claim|approv|program|refill/.test(s)) return 2;
  if (/triage|review|process|match|queue/.test(s)) return 1;
  if (/submit|receiv|pending|new/.test(s)) return 0;
  return 1;
}

function StatusTimeline({ status }: { status?: string }) {
  const active = stageIndex(status);
  const steps = [
    { label: 'Received', ar: 'تم الاستلام' },
    { label: 'Under review', ar: 'قيد المراجعة' },
    { label: 'Pharmacy', ar: 'الصيدلية' },
    { label: 'Ready / done', ar: 'جاهز / تم' },
  ];
  return (
    <div className="px-1 pt-1 pb-2">
      <div className="flex items-center justify-between gap-1">
        {steps.map((st, i) => {
          const done = i < active;
          const cur = i === active;
          return (
            <div key={st.label} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      i <= active ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : cur
                        ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      i < active ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <div className="text-center px-0.5">
                <div
                  className={`text-[10px] sm:text-xs font-medium leading-tight ${
                    cur ? 'text-emerald-900' : done ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </div>
                <div className="text-[9px] text-slate-400 leading-tight" dir="rtl">
                  {st.ar}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 flex gap-2 items-start">
          <span className="text-lg leading-none" aria-hidden>
            📱
          </span>
          <div>
            <p className="font-medium">Last request on this device</p>
            <p className="text-xs mt-0.5" dir="rtl">
              آخر طلب محفوظ على هذا الجهاز — جاهز للعرض
            </p>
          </div>
        </div>
      )}

      <form onSubmit={(e) => lookup(e)} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">
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
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
            />
            <button
              type="button"
              onClick={pasteId}
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {pasted ? '✓' : 'Paste'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            You received this ID after submitting · يصلك بعد تقديم الطلب
          </p>
        </label>

        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700 font-medium">
            Optional verification · تحقق اختياري
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs">Phone · الموبايل</span>
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
          className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md active:scale-[0.99] transition"
        >
          {loading ? 'Looking up… · جاري البحث' : 'Check status · عرض الحالة'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 space-y-3">
          <p className="font-semibold">We couldn't find that request</p>
          <p className="text-xs text-amber-900/80" dir="rtl">
            لم نعثر على الطلب — تأكد من رقم الطلب أو قدّم طلباً جديداً
          </p>
          <ul className="text-xs list-disc list-inside space-y-1 text-amber-900/90">
            <li>Copy the ID exactly from the success screen</li>
            <li>Try optional phone / employee ID verification</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/intake"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"
            >
              Submit a new request
            </Link>
            <Link href="/guide" className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-semibold">
              Help guide
            </Link>
          </div>
        </div>
      )}

      {data && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-5">
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

          <StatusTimeline status={String(data.status || data.status_code || '')} />

          {data.stage_hint != null && (
            <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-900 text-center leading-relaxed">
              {String(data.stage_hint)}
            </p>
          )}

          <dl className="divide-y divide-slate-100 text-sm rounded-xl border border-slate-100 overflow-hidden">
            <div className="flex justify-between gap-3 px-3 py-2.5 bg-slate-50/50">
              <dt className="text-slate-500">Employee</dt>
              <dd className="font-medium text-right">{String(data.emp_name_masked || '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5">
              <dt className="text-slate-500">Patient</dt>
              <dd className="font-medium text-right">{String(data.patient_name_masked || '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5 bg-slate-50/50">
              <dt className="text-slate-500">Medicines</dt>
              <dd className="font-medium">{String(data.med_count ?? '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5">
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-mono text-xs">
                {data.created_at
                  ? String(data.created_at).slice(0, 16).replace('T', ' ')
                  : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
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
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">No ID yet?</p>
          <p className="text-xs text-slate-500" dir="rtl">
            ابدأ بتقديم طلب جديد واحفظ رقم الطلب
          </p>
          <Link
            href="/intake"
            className="inline-flex mt-1 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Submit a request →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function RequestStatusPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-24 md:pb-10">
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
        <Suspense fallback={<p className="text-sm text-slate-500 text-center py-8">Loading…</p>}>
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
