'use client';

import { useCallback, useEffect, useState } from 'react';

type Summary = {
  total_values: number;
  total_hits: number;
  by_key: {
    key: string;
    distinct: number;
    hits: number;
    top: { value: string; hits: number }[];
  }[];
};

const KEY_LABEL: Record<string, string> = {
  medicine: 'Medicines · أدوية',
  city: 'Cities · مدن',
  company: 'Companies · شركات',
  relation: 'Relations · صلة',
};

export function LearningBootstrap() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/learning?summary=1');
      const data = await res.json();
      if (data.ok && data.summary) setSummary(data.summary);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  async function runBootstrap() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bootstrap', limit: 500 }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Bootstrap failed');
      }
      setMsg(
        `Learned from ${data.rows ?? 0} requests · ${data.signals_touched ?? 0} signals updated`
      );
      await loadSummary();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm space-y-3">
      <div>
        <p className="text-sm font-semibold text-violet-950 flex items-center gap-2">
          <span className="text-violet-600">✦</span>
          Smart suggestions · اقتراحات ذكية
        </p>
        <p className="text-xs text-violet-800 mt-1">
          The platform ranks cities, companies, and medicines from real use.
        </p>
      </div>

      {summary && summary.total_values > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-900">
              {summary.total_values} values
            </span>
            <span className="rounded-full bg-white border border-violet-200 px-2.5 py-1 text-violet-800">
              {summary.total_hits} total picks
            </span>
          </div>
          {summary.by_key.map((g) => (
            <div
              key={g.key}
              className="rounded-xl border border-violet-100 bg-white/80 p-2.5 text-xs space-y-1"
            >
              <p className="font-semibold text-violet-900">
                {KEY_LABEL[g.key] || g.key}{' '}
                <span className="font-normal text-violet-600">
                  · {g.distinct} · {g.hits} hits
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.top.map((t) => (
                  <span
                    key={t.value}
                    className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-violet-900"
                    title={`${t.hits}×`}
                  >
                    {t.value}
                    <span className="text-violet-500 ml-1">{t.hits}×</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {summary && summary.total_values === 0 && (
        <p className="text-xs text-violet-700">
          No learned values yet — bootstrap or submit a few intake requests.
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={runBootstrap}
        className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {loading ? 'Learning… · جاري التعلم…' : 'Bootstrap from past requests'}
      </button>
      <button
        type="button"
        onClick={() => void loadSummary()}
        className="w-full text-xs text-violet-700 font-medium hover:underline"
      >
        Refresh insights
      </button>
      {msg && (
        <p className="text-xs font-medium text-emerald-800 flex items-center gap-1.5" role="status">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">
            ✓
          </span>
          {msg}
        </p>
      )}
      {err && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {err}
        </p>
      )}
    </div>
  );
}
