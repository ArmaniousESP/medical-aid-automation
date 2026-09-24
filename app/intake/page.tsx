'use client';

import { useState } from 'react';
import Link from 'next/link';

type MedLine = { name: string; qty: number };

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
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [estimate, setEstimate] = useState<string | null>(null);

  function updateMed(i: number, patch: Partial<MedLine>) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  async function searchMed(q: string) {
    if (q.length < 2) return;
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
      setMeds([{ name: '', qty: 1 }]);
      setComments('');
      setRoshetta('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-xs text-violet-600 font-medium">Step 1 of 5</p>
          <h1 className="text-2xl font-semibold">تقديم طلب علاج شهري</h1>
          <p className="text-sm text-slate-600">
            Submit a monthly aid request · no Google Form needed
          </p>
        </header>

        {resultId && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-sm">
            <p className="font-medium text-emerald-900">
              تم استلام الطلب · Request received
            </p>
            <p className="text-xs font-mono text-emerald-800 break-all">{resultId}</p>
            <p className="text-emerald-800">
              Ops will match medicines and enroll the program. You can close this page.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setResultId(null)}
                className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium"
              >
                Submit another
              </button>
              <Link
                href="/guide"
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
              >
                How it works
              </Link>
              <Link
                href="/intake-ops"
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
              >
                Ops: open queue →
              </Link>
            </div>
          </div>
        )}

        {!resultId && (
          <form
            onSubmit={submit}
            className="rounded-xl border bg-white p-5 shadow-sm space-y-4 text-sm"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">اسم الموظف *</span>
                <input
                  required
                  value={emp_name}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">الرقم الوظيفي</span>
                <input
                  value={emp_id}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">الشركة</span>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">الموبايل</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-500">اسم المريض</span>
                <input
                  value={patient_name}
                  onChange={(e) => setPatient(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">المدينة</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600">الأدوية *</span>
                <button
                  type="button"
                  onClick={() => setMeds((m) => [...m, { name: '', qty: 1 }])}
                  className="text-xs text-blue-600"
                >
                  + دواء
                </button>
              </div>
              {meds.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={m.name}
                    onChange={(e) => {
                      updateMed(i, { name: e.target.value });
                      searchMed(e.target.value);
                    }}
                    placeholder="اسم الدواء"
                    className="flex-1 rounded border px-3 py-2"
                    required={i === 0}
                  />
                  <input
                    type="number"
                    min={1}
                    value={m.qty}
                    onChange={(e) =>
                      updateMed(i, { qty: Number(e.target.value) || 1 })
                    }
                    className="w-16 rounded border px-2 py-2"
                    title="Quantity"
                  />
                </div>
              ))}
              {searchHits.length > 0 && (
                <ul className="text-xs border rounded bg-slate-50 p-2 space-y-1 max-h-32 overflow-y-auto">
                  {searchHits.map((h, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="text-left w-full hover:underline text-indigo-700"
                        onClick={() => {
                          updateMed(meds.length - 1, {
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
                className="text-xs text-slate-600 underline"
              >
                تقدير تكلفة تقريبي (MSH)
              </button>
              {estimate && <p className="text-xs text-slate-500">{estimate}</p>}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">روابط الروشتة (Drive / URL)</span>
              <textarea
                value={roshetta}
                onChange={(e) => setRoshetta(e.target.value)}
                rows={2}
                className="w-full rounded border px-3 py-2 text-xs"
                placeholder="https://..."
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">ملاحظات</span>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="w-full rounded border px-3 py-2"
              />
            </label>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'جاري الإرسال…' : 'إرسال الطلب على المنصة'}
            </button>
          </form>
        )}

        <p className="text-xs text-slate-500 text-center">
          <Link href="/guide" className="text-violet-700 underline">
            How to use
          </Link>
          {' · '}
          Step 2 for ops:{' '}
          <Link href="/intake-ops" className="text-blue-600 underline">
            intake queue
          </Link>
        </p>
      </div>
    </main>
  );
}
