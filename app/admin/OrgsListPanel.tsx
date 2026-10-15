'use client';

import { useCallback, useEffect, useState } from 'react';

type Org = {
  id: string;
  code: string;
  name: string;
  slug: string | null;
  status: string;
  contact_email: string | null;
};

export function OrgsListPanel() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orgs', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orgs');
      setOrgs(data.organizations || data.orgs || []);
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
            المؤسسات المسجّلة على المنصة
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
      {!orgs.length && !loading && !error && (
        <p className="text-xs text-slate-400">No organizations yet.</p>
      )}
      <ul className="divide-y divide-slate-100 text-xs">
        {orgs.map((o) => (
          <li key={o.id || o.code} className="py-2 flex flex-wrap items-center gap-2">
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
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate-400">
        Public register:{' '}
        <a href="/org/register" className="underline hover:text-slate-600">
          /org/register
        </a>
      </p>
    </section>
  );
}
