'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicStepsBar } from '../PublicStepsBar';
import { loadLastRequestId } from '@/lib/intakeDraft';

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none';

function StatusForm() {
  const search = useSearchParams();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fromDevice, setFromDevice] = useState(false);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {fromDevice && id && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          Using last Request ID saved on this device · من آخر طلب على هذا الجهاز
        </p>
      )}
      <form onSubmit={(e) => lookup(e)} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">
            Request ID * · رقم الطلب
          </span>
          <input
            required
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setFromDevice(false);
            }}
            className={field + ' font-mono text-sm'}
            placeholder="Paste your ID here"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700 font-medium">
            Optional verification · تحقق اختياري
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs">Phone · الموبايل</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field + ' mt-1'} />
            </label>
            <label className="block">
              <span className="text-xs">Employee ID · الرقم الوظيفي</span>
              <input value={empId} onChange={(e) => setEmpId(e.target.value)} className={field + ' mt-1'} />
            </label>
          </div>
        </details>
        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md"
        >
          {loading ? 'Looking up…' : 'Check status · عرض الحالة'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-2">
          <p className="font-medium">{error}</p>
          <Link href="/intake" className="inline-block text-sm font-medium underline">
            Submit a new request
          </Link>
        </div>
      )}

      {data && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
            <p className="text-xl font-bold text-emerald-900">{String(data.status_label_ar || '')}</p>
            <p className="text-sm text-emerald-800">{String(data.status_label_en || '')}</p>
          </div>
          {data.stage_hint != null && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 text-center">
              {String(data.stage_hint)}
            </p>
          )}
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-500">Employee</dt>
              <dd className="font-medium text-right">{String(data.emp_name_masked || '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-500">Patient</dt>
              <dd className="font-medium text-right">{String(data.patient_name_masked || '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-500">Medicines</dt>
              <dd className="font-medium">{String(data.med_count ?? '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-500">Submitted</dt>
              <dd className="font-mono text-xs">
                {data.created_at ? String(data.created_at).slice(0, 16).replace('T', ' ') : '—'}
              </dd>
            </div>
          </dl>
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My request status</h1>
          <p className="text-base text-slate-600" dir="rtl">حالة الطلب</p>
        </header>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <StatusForm />
        </Suspense>
        <p className="text-center text-sm text-slate-500 space-x-2">
          <Link href="/intake" className="text-emerald-700 font-medium hover:underline">← Submit</Link>
          <span>·</span>
          <Link href="/" className="hover:underline">Home</Link>
        </p>
      </div>
    </main>
  );
}
