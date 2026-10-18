'use client';

import { useCallback, useEffect, useState } from 'react';

type OrgStat = {
  code: string;
  name: string;
  status: string;
  members: number;
  requests: number;
  pending: number;
};

export function OrgsListPanel() {
  const [stats, setStats] = useState<OrgStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/org-stats', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        // Fallback to public org list if stats require stricter auth
        if (res.status === 401) {
          const r2 = await fetch('/api/orgs', { credentials: 'include' });
          const d2 = await r2.json();
          if (!r2.ok) throw new Error(d2.error || data.error || 'Unauthorized');
          setStats(
            (d2.organizations || []).map(
              (o: { code: string; name: string; status?: string }) => ({
                code: o.code,
                name: o.name,
                status: o.status || 'active',
                members: 0,
                requests: 0,
                pending: 0,
              })
            )
          );
          return;
        }
        throw new Error(data.error || 'Failed to load orgs');
      }
      setStats(data.stats || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Organizations</h2>
          <p className="text-xs text-slate-500" dir="rtl">
            المؤسسات · الطلبات · الأعضاء
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1.5">{error}</p>
      )}
      {!stats.length && !loading && !error && (
        <p className="text-xs text-slate-400">No organizations yet.</p>
      )}
      <ul className="divide-y divide-slate-100 text-xs">
        {stats.map((o) => (
          <li key={o.code} className="py-2.5 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-slate-800">{o.code}</span>
              <span className="text-slate-700">{o.name}</span>
              <span
                className={
                  o.status === 'active'
                    ? 'rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5'
                    : 'rounded-full bg-amber-50 text-amber-800 px-2 py-0.5'
                }
              >
                {o.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span>
                <strong className="text-slate-700">{o.members}</strong> members
              </span>
              <span>
                <strong className="text-slate-700">{o.requests}</strong> requests
              </span>
              {o.pending > 0 && (
                <span className="text-amber-700 font-medium">
                  {o.pending} pending
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-400">
        Onboarding guide:{' '}
        <a
          href="https://github.com/ArmaniousESP/medical-aid-automation/blob/main/docs/multi-org-onboarding.md"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-600"
        >
          multi-org-onboarding.md
        </a>
        {' · '}
        Register:{' '}
        <a href="/org/register" className="underline hover:text-slate-600">
          /org/register
        </a>
      </p>
    </section>
  );
}
