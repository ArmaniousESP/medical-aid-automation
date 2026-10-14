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
  if (s === 'submitted') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (s === 'enrolled') return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
  if (s === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  if (s === 'dispensed') return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
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

function medList(meds: unknown): string[] {
  if (!Array.isArray(meds)) return [];
  return meds.map((m) =>
    typeof m === 'object' && m && 'name' in m
      ? String((m as { name: string }).name)
      : String(m)
  );
}

function relativeAge(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
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

function CopyId({ id }: { id: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {}
      }}
      className="text-[10px] font-mono text-slate-400 hover:text-violet-700"
      title="Copy request ID"
    >
      {ok ? 'copied' : `${id.slice(0, 8)}…`}
    </button>
  );
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
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={1} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="aid-section-label">Step 1 of 5 · Queue</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Queue</h1>
              <p className="text-sm text-slate-600 mt-0.5" dir="rtl">
                طابور الطلبات · عالج ثم انتقل للمطالبات
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

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white/90 p-5 shadow-sm space-y-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-violet-950">Process waiting requests</p>
              <p className="text-xs text-violet-800 mt-0.5">
                Matches meds · enrolls programs · creates claim drafts
              </p>
            </div>
            {waiting > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                {waiting} waiting
              </span>
            ) : (
              status === 'submitted' &&
              !loading && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                  Inbox clear ✓
                </span>
              )
            )}
          </div>
          <ProcessIntakeButton onDone={load} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/claims" className="aid-cta-violet px-4 py-2.5 text-sm">
              Next: Claims →
            </Link>
            <Link
              href="/pharmacy"
              className="rounded-xl border border-white/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white backdrop-blur"
            >
              Pharmacy
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm space-y-3 backdrop-blur">
          <div>
            <label className="text-xs font-semibold text-slate-600">Status · الحالة</label>
            <SearchablePicker
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              allowCreate={false}
              placeholder="Filter by status…"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Search rows · بحث</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                ⌕
              </span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, emp ID, patient, drug…"
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-9 pr-10 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
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

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-2">
            <p className="font-medium">Could not load queue</p>
            <p>{error}</p>
            <p className="text-xs text-red-600">
              Unlock on Admin (Google or secret) if ops are locked.
            </p>
            <Link href="/admin" className="inline-block text-xs font-medium underline">
              Open admin
            </Link>
          </div>
        )}

        {loading && (
          <p className="text-sm text-slate-500 animate-pulse text-center py-4">Loading queue…</p>
        )}

        <div className="space-y-3 md:hidden">
          {filtered.map((r) => {
            const names = medList(r.meds);
            const age = relativeAge(r.created_at);
            return (
              <article
                key={r.id}
                className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-2.5 backdrop-blur active:bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.emp_name || '—'}</p>
                    <p className="text-xs text-slate-500 font-mono">{r.emp_id || 'no emp ID'}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                    {age && <p className="text-[10px] text-slate-400">{age}</p>}
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">Patient</span> {r.patient_name || '—'}
                </p>
                {names.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {names.slice(0, 4).map((n) => (
                      <span
                        key={n}
                        className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {n}
                      </span>
                    ))}
                    {names.length > 4 && (
                      <span className="text-[11px] text-slate-400">+{names.length - 4}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-0.5">
                  <CopyId id={r.id} />
                  {r.program_id && (
                    <Link
                      href={`/programs/${r.program_id}`}
                      className="text-[11px] font-medium text-violet-700"
                    >
                      Program →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
          {!filtered.length && !loading && !error && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-500 text-sm space-y-2 backdrop-blur">
              {q ? (
                <>
                  <p>No matches for “{q}”.</p>
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="text-violet-700 font-medium underline"
                  >
                    Clear search
                  </button>
                </>
              ) : status === 'submitted' ? (
                <>
                  <p className="text-2xl" aria-hidden>
                    ✓
                  </p>
                  <p className="font-medium text-slate-700">Queue is clear</p>
                  <p className="text-xs">Nothing waiting to process</p>
                  <Link href="/claims" className="inline-block mt-2 text-violet-700 font-semibold">
                    Continue to Claims →
                  </Link>
                </>
              ) : (
                <>
                  <p>No “{FILTERS.find((f) => f.id === status)?.label || status}” rows.</p>
                  <Link href="/intake" className="text-emerald-700 font-medium underline">
                    Submit a test request
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block rounded-2xl border border-white/80 bg-white/90 shadow-sm overflow-x-auto backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Employee</th>
                <th className="p-3 font-semibold">Patient</th>
                <th className="p-3 font-semibold">Meds</th>
                <th className="p-3 font-semibold">Age</th>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Program</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const names = medList(r.meds);
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
                      <div className="text-xs font-mono text-slate-500">{r.emp_id || '—'}</div>
                    </td>
                    <td className="p-3">{r.patient_name || '—'}</td>
                    <td className="p-3 text-xs max-w-[240px] text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {names.slice(0, 3).map((n) => (
                          <span
                            key={n}
                            className="rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5"
                          >
                            {n}
                          </span>
                        ))}
                        {names.length > 3 ? (
                          <span className="text-slate-400">+{names.length - 3}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {relativeAge(r.created_at) || '—'}
                    </td>
                    <td className="p-3">
                      <CopyId id={r.id} />
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
                  <td colSpan={7} className="p-10 text-center text-slate-400">
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
                    ) : status === 'submitted' ? (
                      <>
                        Queue clear ·{' '}
                        <Link href="/claims" className="text-violet-700 underline">
                          go to Claims
                        </Link>
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
            <Link href="/claims" className="text-violet-700 font-medium underline">
              go to Claims
            </Link>
          </p>
        )}
      </div>

      <div className="aid-sticky-bar">
        <div className="mx-auto max-w-5xl flex gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            Admin
          </Link>
          <Link href="/claims" className="aid-cta-violet flex-1 py-3 text-center text-sm">
            Claims →
          </Link>
        </div>
      </div>
    </main>
  );
}
