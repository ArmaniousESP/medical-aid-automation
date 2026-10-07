'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlowSteps } from '../FlowSteps';
import { SearchablePicker } from '@/components/SearchablePicker';

type Claim = {
  id: string;
  claim_code?: string;
  patient_name?: string;
  emp_name?: string;
  period?: string;
  total_claimed_egp?: number | null;
  status?: string;
};

const FILTERS = [
  { id: 'draft', label: 'Drafts' },
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid', label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_OPTIONS = FILTERS.map((f) => ({
  value: f.id,
  label: f.label,
}));

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [status, setStatus] = useState('draft');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims?status=${status}&limit=50`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setClaims(data.claims || []);
      setMsg(null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitClaim(id: string) {
    setMsg(null);
    setBusyId(id);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'submit', id }),
      });
      const data = await res.json();
      setMsg(
        data.ok
          ? `Submitted${data.external_ref ? ' · ref ' + data.external_ref : ''}${data.skipped ? ' (internal only)' : ''}`
          : `Error: ${data.error || 'submit failed'}`
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const draftCount = status === 'draft' ? claims.length : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={2} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Step 2 of 5
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Claims</h1>
            <p className="text-sm text-slate-600" dir="rtl">
              المطالبات · راجع المسودات ثم Submit
            </p>
          </div>
        </header>

        <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-700">
            <p className="font-medium">Review drafts → Submit each → Pharmacy</p>
            {draftCount > 0 && (
              <p className="text-xs text-amber-700 mt-0.5 font-semibold">
                {draftCount} draft{draftCount === 1 ? '' : 's'} waiting
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/intake-ops"
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              ← Queue
            </Link>
            <Link
              href="/pharmacy"
              className="rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700"
            >
              Next: Pharmacy →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2">
          <label className="text-xs font-semibold text-slate-600">
            Status filter · حالة المطالبة
          </label>
          <SearchablePicker
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            allowCreate={false}
            placeholder="Search status…"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(s.id)}
              className={`min-h-[2.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                status === s.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={load}
            className="text-xs text-violet-700 font-medium hover:underline ml-1"
          >
            Refresh
          </button>
        </div>

        {msg && (
          <p className="text-sm rounded-xl border bg-white p-3 text-slate-700 shadow-sm">
            {msg}
          </p>
        )}

        {loading && <p className="text-sm text-slate-500 animate-pulse">Loading…</p>}

        <div className="space-y-3 md:hidden">
          {claims.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.patient_name || '—'}</p>
                  <p className="text-xs text-slate-500">{c.emp_name}</p>
                </div>
                <span className="text-[11px] font-semibold rounded-full bg-slate-100 px-2 py-0.5 h-fit">
                  {c.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{c.period || '—'}</span>
                <span className="font-semibold">
                  {c.total_claimed_egp != null
                    ? `${c.total_claimed_egp} EGP`
                    : '—'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">{c.claim_code}</p>
              {c.status === 'draft' && (
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => submitClaim(c.id)}
                  className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busyId === c.id ? '…' : 'Submit claim'}
                </button>
              )}
            </article>
          ))}
          {!claims.length && !loading && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
              No claims here ·{' '}
              <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                process the queue first
              </Link>
            </div>
          )}
        </div>

        <div className="hidden md:block rounded-2xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3 font-semibold">Code</th>
                <th className="p-3 font-semibold">Patient</th>
                <th className="p-3 font-semibold">Period</th>
                <th className="p-3 font-semibold">Total</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50/80">
                  <td className="p-3 font-mono text-xs">{c.claim_code}</td>
                  <td className="p-3">
                    <div className="font-medium">{c.patient_name || '—'}</div>
                    <div className="text-xs text-slate-500">{c.emp_name}</div>
                  </td>
                  <td className="p-3">{c.period}</td>
                  <td className="p-3 font-medium">
                    {c.total_claimed_egp != null
                      ? `${c.total_claimed_egp} EGP`
                      : '—'}
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => submitClaim(c.id)}
                        className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === c.id ? '…' : 'Submit'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!claims.length && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    Empty · process{' '}
                    <Link href="/intake-ops" className="text-violet-700 underline">
                      intake queue
                    </Link>{' '}
                    first
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
