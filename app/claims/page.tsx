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

function statusStyle(s?: string) {
  const x = (s || '').toLowerCase();
  if (x === 'draft') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (x === 'submitted' || x === 'under_review')
    return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200';
  if (x === 'approved' || x === 'paid')
    return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
  if (x === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [status, setStatus] = useState('draft');
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims?status=${status}&limit=50`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setClaims(data.claims || []);
      if (!msgOk) setMsg(null);
    } catch (e: unknown) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [status, msgOk]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitClaim(id: string) {
    setMsg(null);
    setMsgOk(false);
    setBusyId(id);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'submit', id }),
      });
      const data = await res.json();
      const ok = !!data.ok;
      setMsgOk(ok);
      setMsg(
        ok
          ? `Submitted${data.external_ref ? ' · ref ' + data.external_ref : ''}${data.skipped ? ' (internal only)' : ''}`
          : `Error: ${data.error || 'submit failed'}`
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function submitAllDrafts() {
    const drafts = claims.filter((c) => c.status === 'draft');
    if (!drafts.length) return;
    setBatchBusy(true);
    setMsg(null);
    setMsgOk(false);
    let okN = 0;
    let failN = 0;
    try {
      for (const c of drafts) {
        setBusyId(c.id);
        try {
          const res = await fetch('/api/claims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'submit', id: c.id }),
          });
          const data = await res.json();
          if (data.ok) okN += 1;
          else failN += 1;
        } catch {
          failN += 1;
        }
      }
      setMsgOk(failN === 0);
      setMsg(
        failN === 0
          ? `Submitted ${okN} draft${okN === 1 ? '' : 's'}`
          : `Submitted ${okN}, failed ${failN}`
      );
      await load();
    } finally {
      setBusyId(null);
      setBatchBusy(false);
    }
  }

  const draftCount =
    status === 'draft'
      ? claims.length
      : claims.filter((c) => c.status === 'draft').length;

  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={2} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 2 of 5 · Claims
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Claims</h1>
              <p className="text-sm text-slate-600" dir="rtl">
                المطالبات · راجع المسودات ثم Submit
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50 backdrop-blur"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white/90 p-5 shadow-sm space-y-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-violet-950">
                Review drafts → Submit → Pharmacy
              </p>
              <p className="text-xs text-violet-800 mt-0.5">
                One-tap submit, or submit all drafts at once
              </p>
            </div>
            {draftCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                {draftCount} draft{draftCount === 1 ? '' : 's'}
              </span>
            ) : (
              !loading &&
              status === 'draft' && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                  No drafts ✓
                </span>
              )
            )}
          </div>
          {status === 'draft' && draftCount > 0 && (
            <button
              type="button"
              disabled={batchBusy}
              onClick={submitAllDrafts}
              className="w-full sm:w-auto rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50 shadow-md shadow-violet-700/25"
            >
              {batchBusy
                ? 'Submitting all…'
                : `Submit all ${draftCount} draft${draftCount === 1 ? '' : 's'}`}
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/intake-ops"
              className="rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white backdrop-blur"
            >
              ← Queue
            </Link>
            <Link
              href="/pharmacy"
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-md shadow-teal-600/25"
            >
              Next: Pharmacy →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm space-y-2 backdrop-blur">
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
              className={`min-h-[2.5rem] rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                status === s.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white/90 border border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {msg && (
          <p
            className={`text-sm rounded-xl border p-3 shadow-sm ${
              msgOk
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            {msg}
          </p>
        )}

        {loading && (
          <p className="text-sm text-slate-500 animate-pulse text-center py-4">
            Loading claims…
          </p>
        )}

        <div className="space-y-3 md:hidden">
          {claims.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-3 backdrop-blur"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.patient_name || '—'}</p>
                  <p className="text-xs text-slate-500">{c.emp_name}</p>
                </div>
                <span
                  className={`text-[11px] font-semibold rounded-full px-2 py-0.5 h-fit shrink-0 ${statusStyle(
                    c.status
                  )}`}
                >
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
                  disabled={busyId === c.id || batchBusy}
                  onClick={() => submitClaim(c.id)}
                  className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-md shadow-violet-700/25"
                >
                  {busyId === c.id ? 'Submitting…' : 'Submit claim'}
                </button>
              )}
            </article>
          ))}
          {!claims.length && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500 space-y-2 backdrop-blur">
              {status === 'draft' ? (
                <>
                  <p className="text-2xl" aria-hidden>
                    ✓
                  </p>
                  <p className="font-medium text-slate-700">No drafts waiting</p>
                  <Link
                    href="/pharmacy"
                    className="inline-block mt-1 text-teal-700 font-semibold"
                  >
                    Continue to Pharmacy →
                  </Link>
                </>
              ) : (
                <>
                  <p>No claims in this filter</p>
                  <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                    process the queue first
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block rounded-2xl border border-white/80 bg-white/90 shadow-sm overflow-hidden backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
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
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        disabled={busyId === c.id || batchBusy}
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
                    {status === 'draft' ? (
                      <>
                        No drafts ·{' '}
                        <Link href="/pharmacy" className="text-teal-700 underline">
                          go to Pharmacy
                        </Link>
                      </>
                    ) : (
                      <>
                        Empty · process{' '}
                        <Link href="/intake-ops" className="text-violet-700 underline">
                          intake queue
                        </Link>{' '}
                        first
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200/70 bg-white/90 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl p-3 md:hidden">
        <div className="mx-auto max-w-4xl flex gap-2">
          <Link
            href="/intake-ops"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Queue
          </Link>
          <Link
            href="/pharmacy"
            className="flex-1 rounded-xl bg-teal-600 py-3 text-center text-sm font-semibold text-white"
          >
            Pharmacy →
          </Link>
        </div>
      </div>
    </main>
  );
}
