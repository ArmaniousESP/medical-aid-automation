'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProcessIntakeButton } from '../ProcessIntakeButton';
import { FlowSteps } from '../FlowSteps';

export default function IntakeOpsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('submitted');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake?status=${status}&limit=100`);
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

  const pendingCount = rows.filter(
    (r) => r.status === 'submitted' || r.status === 'triage'
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={2} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs text-violet-600 font-medium">Steps 2–3 · Ops</p>
              <h1 className="text-2xl font-semibold">Intake queue</h1>
              <p className="text-sm text-slate-600">
                Review new requests, then run Process (match + enroll)
              </p>
            </div>
            <Link
              href="/intake"
              className="text-sm text-blue-600 hover:underline self-start"
            >
              + New request
            </Link>
          </div>
        </header>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
          <p className="text-sm text-violet-900">
            <strong>What to do:</strong> Filter <em>submitted</em> → click{' '}
            <strong>Process platform intake</strong> → check Programs & Claims.
          </p>
          <ProcessIntakeButton />
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/claims"
              className="rounded-lg bg-white border border-violet-300 px-3 py-1.5 font-medium text-violet-900"
            >
              Next: Claims →
            </Link>
            <Link
              href="/programs"
              className="rounded-lg bg-white border border-violet-300 px-3 py-1.5 font-medium text-violet-900"
            >
              Programs
            </Link>
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-white border border-violet-300 px-3 py-1.5 font-medium text-violet-900"
            >
              Refresh list
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'submitted', 'triage', 'enrolled', 'rejected', 'dispensed'].map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === s
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border text-slate-600'
                }`}
              >
                {s}
              </button>
            )
          )}
          {status === 'submitted' && rows.length > 0 && (
            <span className="text-xs text-amber-700 font-medium">
              {rows.length} waiting
            </span>
          )}
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-medium">Load error</div>
            <div>{error}</div>
            <div className="text-xs mt-1 text-red-600">
              Need DATABASE_URL. If PROCESS_SECRET is set, unlock on Home first.
            </div>
            <Link href="/status" className="text-xs text-blue-700 underline mt-1 inline-block">
              System status
            </Link>
          </div>
        )}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Meds</th>
                <th className="p-3">Created</th>
                <th className="p-3">Program</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meds = Array.isArray(r.meds) ? r.meds : [];
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">
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
                    <td className="p-3 text-xs max-w-[200px]">
                      {meds
                        .map((m: any) => m.name || m)
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
                          className="text-blue-600 hover:underline"
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
              {!rows.length && !loading && !error && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No rows for “{status}”.{' '}
                    <Link href="/intake" className="text-blue-600 underline">
                      Submit a request
                    </Link>{' '}
                    or switch filter to <em>all</em>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pendingCount === 0 && status === 'submitted' && !loading && !error && (
          <p className="text-center text-sm text-slate-500">
            Queue empty for submitted ·{' '}
            <Link href="/claims" className="text-violet-700 underline">
              continue to Claims
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
