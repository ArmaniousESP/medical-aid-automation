'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlowSteps } from '../FlowSteps';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [status, setStatus] = useState('draft');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims?status=${status}&limit=50`);
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
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', id }),
    });
    const data = await res.json();
    setMsg(
      data.ok
        ? `Submitted${data.external_ref ? ' · ref ' + data.external_ref : ''}${data.skipped ? ' (internal only — no webhook)' : ''}`
        : `Error: ${data.error || 'submit failed'}`
    );
    load();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={4} />
          <div>
            <p className="text-xs text-violet-600 font-medium">Step 4 · Finance / ops</p>
            <h1 className="text-2xl font-semibold">Claims</h1>
            <p className="text-sm text-slate-600">
              Review draft amounts, then Submit. Next: Programs / Pharmacy.
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-2">
          <p>
            <strong>What to do:</strong> Open <em>draft</em> claims → check totals →{' '}
            <strong>Submit</strong>. Without a webhook, submit marks the claim as submitted
            internally.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/intake-ops"
              className="rounded-lg border px-3 py-1.5 font-medium hover:bg-slate-50"
            >
              ← Back: intake queue
            </Link>
            <Link
              href="/programs"
              className="rounded-lg border px-3 py-1.5 font-medium hover:bg-slate-50"
            >
              Programs
            </Link>
            <Link
              href="/pharmacy"
              className="rounded-lg bg-teal-600 text-white px-3 py-1.5 font-medium hover:bg-teal-700"
            >
              Next: Pharmacy →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'draft', 'submitted', 'under_review', 'approved', 'paid', 'rejected'].map(
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
          <button
            type="button"
            onClick={load}
            className="text-xs text-blue-600 underline ml-2"
          >
            Refresh
          </button>
        </div>

        {msg && (
          <p className="text-sm rounded border bg-white p-3 text-slate-700">{msg}</p>
        )}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Period</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{c.claim_code}</td>
                  <td className="p-3">
                    <div>{c.patient_name || '—'}</div>
                    <div className="text-xs text-slate-500">{c.emp_name}</div>
                  </td>
                  <td className="p-3">{c.period}</td>
                  <td className="p-3">
                    {c.total_claimed_egp != null
                      ? `${c.total_claimed_egp} EGP`
                      : '—'}
                  </td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => submitClaim(c.id)}
                        className="text-xs text-indigo-700 underline"
                      >
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!claims.length && !loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 space-y-2">
                    <p>No claims in “{status}”.</p>
                    <p className="text-xs">
                      Run process on{' '}
                      <Link href="/intake-ops" className="text-blue-600 underline">
                        intake queue
                      </Link>{' '}
                      with AUTO_CLAIM_ON_ENROLL=true, or switch filter to <em>all</em>.
                    </p>
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
