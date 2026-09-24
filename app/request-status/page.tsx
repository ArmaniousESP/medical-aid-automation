'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RequestStatusPage() {
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-md space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">حالة الطلب</h1>
          <p className="text-sm text-slate-600">Check request status</p>
          <p className="text-xs text-slate-500">
            Enter the Request ID you received after submit. Optional phone or
            employee ID for extra verification.
          </p>
        </header>

        <form
          onSubmit={lookup}
          className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm"
        >
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Request ID *</span>
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded border px-3 py-2 font-mono text-xs"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Phone (optional)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">Employee ID (optional)</span>
            <input
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 text-white py-2.5 font-medium disabled:opacity-50"
          >
            {loading ? '…' : 'Check status'}
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}

        {data && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm">
            <p className="font-semibold text-emerald-900">
              {data.status_label_ar} · {data.status_label_en}
            </p>
            <p className="text-emerald-800">{data.stage_hint}</p>
            <dl className="text-xs text-slate-700 space-y-1 pt-2">
              <div className="flex justify-between gap-2">
                <dt>Employee</dt>
                <dd>{data.emp_name_masked}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Patient</dt>
                <dd>{data.patient_name_masked}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Medicines</dt>
                <dd>{data.med_count} item(s)</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Submitted</dt>
                <dd className="font-mono">
                  {data.created_at
                    ? String(data.created_at).slice(0, 16).replace('T', ' ')
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          <Link href="/intake" className="text-emerald-700 underline">
            Submit a new request
          </Link>
          {' · '}
          <Link href="/" className="text-blue-600 underline">
            Home
          </Link>
        </p>
      </div>
    </main>
  );
}
