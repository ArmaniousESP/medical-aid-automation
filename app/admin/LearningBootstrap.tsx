'use client';

import { useState } from 'react';

export function LearningBootstrap() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
          Seed popular cities, companies, and medicines from past requests so pickers
          improve immediately.
        </p>
        <p className="text-xs text-violet-700 mt-0.5" dir="rtl">
          استيراد من الطلبات السابقة لتحسين القوائم فوراً
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={runBootstrap}
        className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {loading ? 'Learning… · جاري التعلم…' : 'Bootstrap from past requests'}
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
