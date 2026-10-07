'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProcessIntakeButton } from '../ProcessIntakeButton';
import { FlowSteps } from '../FlowSteps';
import { SearchablePicker } from '@/components/SearchablePicker';

type Row = {
  id: string;
  status: string;
  emp_name?: string;
  emp_id?: string;
  patient_name?: string;
  meds?: unknown;
  created_at?: string;
  program_id?: string;
};

const FILTERS = [
  { id: 'submitted', label: 'Waiting' },
  { id: 'all', label: 'All' },
  { id: 'triage', label: 'Triage' },
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'dispensed', label: 'Dispensed' },
];

const STATUS_OPTIONS = FILTERS.map((f) => ({
  value: f.id,
  label: f.label,
}));

function statusStyle(s: string) {
  if (s === 'submitted') return 'bg-amber-100 text-amber-900';
  if (s === 'enrolled') return 'bg-emerald-100 text-emerald-900';
  if (s === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function medNames(meds: unknown): string {
  if (!Array.isArray(meds)) return '';
  return meds
    .map((m) =>
      typeof m === 'object' && m && 'name' in m
        ? String((m as { name: string }).name)
        : String(m)
    )
    .join(' ');
}

function matches(r: Row, q: string): boolean {
  if (!q) return true;
  const hay = [
    r.emp_name,
    r.emp_id,
    r.patient_name,
    r.status,
    r.id,
    r.program_id,
    medNames(r.meds),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export default function IntakeOpsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('submitted');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake?status=${status}&limit=100`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.code || 'Failed');
      setRows(data.requests || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => matches(r, q.trim())),
    [rows, q]
  );

  const waiting = status === 'submitted' ? rows.length : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={1} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 1 of 5
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Queue
              </h1>
              <p className="text-sm text-slate-600 mt-0.5" dir="rtl">
                طابور الطلبات · عالج ثم انتقل للمطالبات
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="text-sm text-violet-700 font-medium hover:underline"
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-violet-950">
                Process waiting requests
              </p>
              <p className="text-xs text-violet-800 mt-0.5">
                Matches meds · enrolls programs · creates claim drafts
              </p>
            </div>
            {waiting > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                {waiting} waiting
              </span>
            )}
          </div>
          <ProcessIntakeButton onDone={load} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/claims"
              className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50"
            >
              Skip to Claims →
            </Link>
            <Link
              href="/pharmacy"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Pharmacy
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Status · الحالة
            </label>
            <SearchablePicker
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              allowCreate={false}
              placeholder="Filter by status…"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Search rows · بحث
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                ⌕
              </span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, emp ID, patient, drug…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                dir="auto"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Showing {filtered.length} of {rows.length}
              {q ? ` · “${q}”` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(s.id)}
              className={`min-h-[2.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                status === s.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-1">
            <p className="font-medium">Could not load queue</p>
            <p>{error}</p>
            <p className="text-xs text-red-600">
              Unlock on Admin (Google or secret) if ops are locked.
            </p>
            <Link href="/admin" className="text-xs font-medium underline">
              Open admin
            </Link>
          </div>
        )}

        {loading && (
          <p className="text-sm text-slate-500 animate-pulse">Loading queue…</p>
        )}

        <div className="space-y-3 md:hidden">
          {filtered.map((r) => {
            const meds = Array.isArray(r.meds) ? r.meds : [];
            const names = meds
              .map((m: unknown) =>
                typeof m === 'object' && m && 'name' in m
                  ? String((m as { name: string }).name)
                  : String(m)
              )
              .slice(0, 3)
              .join(', ');
            return (
              <article
                key={r.id}
                className="rounded-2xl border bg-white p-4 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {r.emp_name || '—'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      {r.emp_id || 'no ID'}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Patient: {r.patient_name || '—'}
                </p>
                {names && (
                  <p className="text-xs text-slate-500 line-clamp-2">{names}</p>
                )}
                <p className="text-[11px] text-slate-400">
                  {r.created_at
                    ? String(r.created_at).slice(0, 16).replace('T', ' ')
                    : ''}
                </p>
              </article>
            );
          })}
          {!filtered.length && !loading && !error && (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500 text-sm">
              {q
                ? `No matches for “${q}”.`
                : `No “${FILTERS.find((f) => f.id === status)?.label || status}” rows.`}
              <div className="mt-2">
                {q ? (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="text-violet-700 font-medium underline"
                  >
                    Clear search
                  </button>
                ) : (
                  <Link href="/intake" className="text-emerald-700 font-medium underline">
                    Submit a test request
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block rounded-2xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Employee</th>
                <th className="p-3 font-semibold">Patient</th>
                <th className="p-3 font-semibold">Meds</th>
                <th className="p-3 font-semibold">Created</th>
                <th className="p-3 font-semibold">Program</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meds = Array.isArray(r.meds) ? r.meds : [];
                return (
                  <tr key={r.id} className="border-t hover:bg-slate-50/80">
                    <td className="p-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.emp_name}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {r.emp_id || '—'}
                      </div>
                    </td>
                    <td className="p-3">{r.patient_name || '—'}</td>
                    <td className="p-3 text-xs max-w-[220px] text-slate-600">
                      {meds
                        .map((m: unknown) =>
                          typeof m === 'object' && m && 'name' in m
                            ? String((m as { name: string }).name)
                            : String(m)
                        )
                        .slice(0, 4)
                        .join(', ')}
                      {meds.length > 4 ? '…' : ''}
                    </td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {r.created_at
                        ? String(r.created_at).slice(0, 16).replace('T', ' ')
                        : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {r.program_id ? (
                        <Link
                          href={`/programs/${r.program_id}`}
                          className="text-violet-700 hover:underline"
                        >
                          {String(r.program_id).slice(0, 8)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !loading && !error && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    {q ? (
                      <>
                        No matches ·{' '}
                        <button
                          type="button"
                          onClick={() => setQ('')}
                          className="text-violet-700 underline"
                        >
                          clear search
                        </button>
                      </>
                    ) : (
                      <>
                        Empty filter ·{' '}
                        <Link href="/intake" className="text-emerald-700 underline">
                          submit a request
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {waiting === 0 && status === 'submitted' && !loading && !error && (
          <p className="text-center text-sm text-slate-500">
            Nothing waiting ·{' '}
            <Link href="/claims" className="text-violet-700 font-medium hover:underline">
              go to Claims
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
