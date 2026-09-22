'use client';

import { useState } from 'react';

export function DdinterCheckForm() {
  const [text, setText] = useState('Warfarin, Aspirin, Ibuprofen');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const drugs = text
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/ddinter/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={check} className="space-y-2 text-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded border px-2 py-1.5 text-sm"
        placeholder="Drug names, comma-separated"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-600 px-3 py-1.5 text-white text-xs disabled:opacity-50"
      >
        {loading ? 'Checking…' : 'Check interactions'}
      </button>
      {result && (
        <div className="mt-2 space-y-2">
          {!result.ok && (
            <p className="text-red-600 text-xs">{result.error}</p>
          )}
          {result.pair_db_count === 0 && (
            <p className="text-amber-700 text-xs">
              No pairs in DB — run Import first.
            </p>
          )}
          {result.hits?.length === 0 && result.pair_db_count > 0 && (
            <p className="text-slate-500 text-xs">No DDInter hits for this list.</p>
          )}
          {result.hits?.map(
            (
              h: { level: string; drug_a: string; drug_b: string; matched_via: string },
              i: number
            ) => (
              <div
                key={i}
                className={`rounded border p-2 text-xs ${
                  h.level === 'Major'
                    ? 'border-red-300 bg-red-50'
                    : h.level === 'Moderate'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="font-semibold">{h.level}</span>
                {': '}
                {h.drug_a} × {h.drug_b}
                <div className="text-slate-500 mt-0.5">{h.matched_via}</div>
              </div>
            )
          )}
        </div>
      )}
    </form>
  );
}
