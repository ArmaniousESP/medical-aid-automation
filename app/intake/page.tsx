'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicStepsBar } from '../PublicStepsBar';

type MedLine = { name: string; qty: number };

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none';
const label = 'block text-sm font-medium text-slate-700 mb-1.5';

export default function IntakePage() {
  const [emp_name, setEmpName] = useState('');
  const [emp_id, setEmpId] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [patient_name, setPatient] = useState('');
  const [city, setCity] = useState('');
  const [comments, setComments] = useState('');
  const [roshetta, setRoshetta] = useState('');
  const [meds, setMeds] = useState<MedLine[]>([{ name: '', qty: 1 }]);
  const [loading, setLoading] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<
    { name_en?: string; name_ar?: string; price_egp?: number }[]
  >([]);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeMedIdx, setActiveMedIdx] = useState(0);

  function updateMed(i: number, patch: Partial<MedLine>) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  async function copyId() {
    if (!resultId) return;
    try {
      await navigator.clipboard.writeText(resultId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  async function searchMed(q: string, idx: number) {
    setActiveMedIdx(idx);
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search_med', q, limit: 6 }),
    });
    const data = await res.json();
    setSearchHits(data.items || []);
  }

  async function runEstimate() {
    const lines = meds
      .filter((m) => m.name.trim())
      .map((m) => ({ query: m.name, quantity: m.qty || 1 }));
    if (!lines.length) return;
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'estimate', lines }),
    });
    const data = await res.json();
    setEstimate(
      data.total_egp != null
        ? `~${data.total_egp} EGP (indicative)${data.disclaimer ? ' — ' + data.disclaimer : ''}`
        : data.error || 'No estimate'
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultId(null);
    setCopied(false);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_name,
          emp_id,
          company,
          phone,
          patient_name,
          city,
          comments,
          meds: meds.filter((m) => m.name.trim()),
          roshetta_urls: roshetta
            .split(/[,\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          source: 'platform',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Submit failed');
      setResultId(data.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-28 md:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-5">
        <PublicStepsBar active="submit" />

        <header className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Submit request
          </h1>
          <p className="text-base text-slate-600" dir="rtl">
            تقديم طلب علاج شهري
          </p>
          <p className="text-sm text-slate-500">
            Required fields marked * · الحقول المطلوبة *
          </p>
        </header>

        {resultId && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-bold">
                ✓
              </span>
              <div>
                <p className="text-lg font-semibold text-emerald-950">
                  Request received
                </p>
                <p className="text-sm text-emerald-800" dir="rtl">
                  تم استلام طلبك بنجاح
                </p>
              </div>
            </div>
            <p className="text-sm text-emerald-900 font-medium">
              Save this ID — you need it to check status.
              <span className="block text-xs font-normal mt-1" dir="rtl">
                احفظ الرقم — ستحتاجه لمتابعة الحالة
              </span>
            </p>
            <div className="rounded-xl bg-white border border-emerald-200 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                Request ID
              </p>
              <p className="font-mono text-sm break-all text-slate-900 select-all">
                {resultId}
              </p>
            </div>
            <button
              type="button"
              onClick={copyId}
              className="w-full rounded-xl bg-emerald-700 py-3.5 text-base font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? 'Copied ✓ · تم النسخ' : 'Copy Request ID · نسخ الرقم'}
            </button>
            <Link
              href={`/request-status?id=${encodeURIComponent(resultId)}`}
              className="block w-full rounded-xl border-2 border-emerald-600 bg-white py-3.5 text-center text-base font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Check status now → · عرض الحالة
            </Link>
            <button
              type="button"
              onClick={() => {
                setResultId(null);
                setMeds([{ name: '', qty: 1 }]);
                setComments('');
                setRoshetta('');
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800 underline"
            >
              Submit another request
            </button>
          </div>
        )}

        {!resultId && (
          <form onSubmit={submit} className="space-y-5">
            {/* Section 1 */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  A
                </span>
                About you · بيانات الموظف
              </h2>
              <label className="block">
                <span className={label}>Employee name * · اسم الموظف</span>
                <input
                  required
                  autoComplete="name"
                  value={emp_name}
                  onChange={(e) => setEmpName(e.target.value)}
                  className={field}
                  placeholder="Full name"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Employee ID · الرقم الوظيفي</span>
                  <input
                    value={emp_id}
                    onChange={(e) => setEmpId(e.target.value)}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Phone · الموبايل</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={field}
                    placeholder="01xxxxxxxxx"
                  />
                </label>
              </div>
              <label className="block">
                <span className={label}>Company · الشركة</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={field}
                />
              </label>
            </section>

            {/* Section 2 */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  B
                </span>
                Patient · المريض
              </h2>
              <label className="block">
                <span className={label}>Patient name · اسم المريض</span>
                <input
                  value={patient_name}
                  onChange={(e) => setPatient(e.target.value)}
                  className={field}
                  placeholder="If different from employee"
                />
              </label>
              <label className="block">
                <span className={label}>City · المدينة</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={field}
                />
              </label>
            </section>

            {/* Section 3 */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    C
                  </span>
                  Medicines * · الأدوية
                </h2>
                <button
                  type="button"
                  onClick={() => setMeds((m) => [...m, { name: '', qty: 1 }])}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  + Add · إضافة
                </button>
              </div>
              {meds.map((m, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      value={m.name}
                      onChange={(e) => {
                        updateMed(i, { name: e.target.value });
                        searchMed(e.target.value, i);
                      }}
                      placeholder={`Medicine ${i + 1} · اسم الدواء`}
                      className={field}
                      required={i === 0}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      value={m.qty}
                      onChange={(e) =>
                        updateMed(i, { qty: Number(e.target.value) || 1 })
                      }
                      className={field + ' text-center'}
                      title="Quantity · الكمية"
                      aria-label="Quantity"
                    />
                  </div>
                  {meds.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMeds((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="mt-2 text-xs text-red-600 px-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {searchHits.length > 0 && (
                <ul className="rounded-xl border bg-slate-50 p-2 space-y-1 max-h-40 overflow-y-auto">
                  {searchHits.map((h, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="w-full text-left rounded-lg px-3 py-2 text-sm text-indigo-800 hover:bg-white"
                        onClick={() => {
                          updateMed(activeMedIdx, {
                            name: h.name_en || h.name_ar || '',
                          });
                          setSearchHits([]);
                        }}
                      >
                        {h.name_en || h.name_ar}
                        {h.price_egp != null ? ` · ${h.price_egp} EGP` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={runEstimate}
                className="text-sm text-slate-600 underline"
              >
                Optional: estimate cost · تقدير تقريبي
              </button>
              {estimate && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  {estimate}
                </p>
              )}
            </section>

            {/* Section 4 optional */}
            <details className="rounded-2xl border bg-white shadow-sm open:pb-4">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Optional · اختياري — prescription links & notes
              </summary>
              <div className="px-5 space-y-4">
                <label className="block">
                  <span className={label}>Roshetta / Drive links</span>
                  <textarea
                    value={roshetta}
                    onChange={(e) => setRoshetta(e.target.value)}
                    rows={2}
                    className={field + ' text-sm'}
                    placeholder="https://..."
                  />
                </label>
                <label className="block">
                  <span className={label}>Notes · ملاحظات</span>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    className={field}
                  />
                </label>
              </div>
            </details>

            {error && (
              <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-4">
                {error}
              </p>
            )}

            {/* Desktop submit */}
            <button
              type="submit"
              disabled={loading}
              className="hidden md:block w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md"
            >
              {loading ? 'Sending… · جاري الإرسال…' : 'Submit request · إرسال الطلب'}
            </button>

            {/* Mobile sticky submit */}
            <div className="fixed bottom-16 inset-x-0 z-40 border-t bg-white/95 backdrop-blur p-3 md:hidden safe-bottom">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-lg mx-auto block rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white disabled:opacity-50 shadow-lg"
              >
                {loading ? '…' : 'Submit · إرسال'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 pb-4">
          <Link href="/request-status" className="text-emerald-700 font-medium hover:underline">
            Already submitted? Check status
          </Link>
          {' · '}
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </p>
      </div>
    </main>
  );
}
