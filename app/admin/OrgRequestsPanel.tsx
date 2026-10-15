'use client';

import { useCallback, useEffect, useState } from 'react';

type OrgReq = {
  id: string;
  org_name: string;
  org_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  created_at: string;
};

export function OrgRequestsPanel() {
  const [requests, setRequests] = useState<OrgReq[]>([]);
  const [mode, setMode] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/org-requests', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRequests(data.requests || []);
      setMode(data.mode || 'auto');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/org-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Action failed');
      }
      setMsg(action === 'approve' ? 'Approved' : 'Rejected');
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Organization requests</h2>
          <p className="text-xs text-slate-500">
            Mode:{' '}
            <code className="bg-white/80 px-1 rounded text-[10px]">{mode}</code>
            {mode === 'approval'
              ? ' — new orgs wait for approval'
              : ' — new orgs auto-activate (set ORG_REGISTRATION_MODE=approval to queue)'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Refresh
        </button>
      </div>

      {msg && (
        <p className="text-xs text-slate-700 bg-white/80 rounded-lg px-2 py-1.5 border border-slate-100">
          {msg}
        </p>
      )}

      {!requests.length ? (
        <p className="text-xs text-slate-400">No pending organization registrations.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white bg-white/90 p-3 text-xs space-y-2 shadow-sm"
            >
              <div className="font-semibold text-slate-900">{r.org_name}</div>
              <div className="text-slate-500 font-mono">{r.org_code}</div>
              <div className="text-slate-600">
                {r.contact_name} · {r.contact_email}
                {r.contact_phone ? ` · ${r.contact_phone}` : ''}
              </div>
              {r.message && <p className="text-slate-500 italic">{r.message}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => decide(r.id, 'approve')}
                  className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => decide(r.id, 'reject')}
                  className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
