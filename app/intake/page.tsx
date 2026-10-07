'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { PublicStepsBar } from '../PublicStepsBar';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';
import {
  CITY_OPTIONS,
  COMPANY_OPTIONS,
  RELATION_OPTIONS,
} from '@/lib/intakeOptions';

type MedLine = { name: string; qty: number };

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none';
const label = 'block text-sm font-medium text-slate-700 mb-1.5';

async function loadMedOptions(q: string): Promise<PickerOption[]> {
  const res = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search_med', q, limit: 8 }),
  });
  const data = await res.json();
  const items = (data.items || []) as {
    name_en?: string;
    name_ar?: string;
    price_egp?: number;
  }[];
  return items.map((it) => {
    const name = it.name_en || it.name_ar || '';
    return {
      value: name,
      label: name,
      sublabel: [
        it.name_ar && it.name_en ? it.name_ar : null,
        it.price_egp != null ? `~${it.price_egp} EGP` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });
}

export default function IntakePage() {
  const [emp_name, setEmpName] = useState('');
  const [emp_id, setEmpId] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [patient_name, setPatient] = useState('');
  const [relation, setRelation] = useState('self');
  const [city, setCity] = useState('');
  const [comments, setComments] = useState('');
  const [roshetta, setRoshetta] = useState('');
  const [meds, setMeds] = useState<MedLine[]>([{ name: '', qty: 1 }]);
  const [loading, setLoading] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function updateMed(i: number, patch: Partial<MedLine>) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  const medLoader = useCallback((q: string) => loadMedOptions(q), []);

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
          relation,
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
      const signals: { key: string; value: string; weight?: number }[] = [];
      if (company.trim()) signals.push({ key: 'company', value: company.trim() });
      if (city.trim()) signals.push({ key: 'city', value: city.trim() });
      if (relation.trim()) signals.push({ key: 'relation', value: relation.trim() });
      for (const m of meds) {
        if (m.name.trim()) {
          signals.push({ key: 'medicine', value: m.name.trim(), weight: 1.5 });
        }
      }
      if (signals.length) {
        void fetch('/api/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signals }),
          keepalive: true,
        }).catch(() => {});
      }
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
            Gets smarter with every request · يتحسن مع كل طلب
          </p>
        </header>

        {resultId && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white">
                ✓
              </span>
              <div>
                <p className="font-semibold text-emerald-950">Request received</p>
                <p className="text-sm text-emerald-800" dir="rtl">
                  تم استلام الطلب — احفظ الرقم
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-200 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Request ID</p>
              <p className="font-mono text-lg font-bold text-slate-900 select-all">
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
                <SearchablePicker
                  value={company}
                  onChange={setCompany}
                  options={COMPANY_OPTIONS}
                  learnKey="company"
                  allowCreate
                  placeholder="Search or add company…"
                  emptyHint="Type to add a new company"
                />
              </label>
            </section>

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
                <span className={label}>Relation · صلة القرابة</span>
                <SearchablePicker
                  value={relation}
                  onChange={setRelation}
                  options={RELATION_OPTIONS}
                  learnKey="relation"
                  allowCreate
                  placeholder="Self, spouse, child…"
                />
              </label>
              <label className="block">
                <span className={label}>City · المدينة</span>
                <SearchablePicker
                  value={city}
                  onChange={setCity}
                  options={CITY_OPTIONS}
                  learnKey="city"
                  allowCreate
                  placeholder="Search city or type new…"
                  emptyHint="Type to add a city"
                />
              </label>
            </section>

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
              <p className="text-xs text-slate-500">
                Suggestions improve from real requests. Pick a match or type a new name.
              </p>
              {meds.map((m, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <SearchablePicker
                      value={m.name}
                      onChange={(v) => updateMed(i, { name: v })}
                      loadOptions={medLoader}
                      learnKey="medicine"
                      allowCreate
                      minQueryLength={2}
                      required={i === 0}
                      placeholder={`Medicine ${i + 1} · اسم الدواء`}
                      emptyHint="Keep typing or add as new"
                      createLabel={(q) => `Use “${q}” as written · استخدام كما هو`}
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
                      className={field}
                      aria-label="Quantity"
                    />
                  </div>
                  {meds.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMeds((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="mt-2 text-xs text-red-600 hover:underline px-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={runEstimate}
                className="text-sm font-medium text-violet-700 hover:underline"
              >
                Estimate cost · تقدير التكلفة
              </button>
              {estimate && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{estimate}</p>
              )}
            </section>

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

            <button
              type="submit"
              disabled={loading}
              className="hidden md:block w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md"
            >
              {loading ? 'Sending… · جاري الإرسال…' : 'Submit request · إرسال الطلب'}
            </button>

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
          <Link
            href="/request-status"
            className="text-emerald-700 font-medium hover:underline"
          >
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
