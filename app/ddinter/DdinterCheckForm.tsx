'use client';

import { useCallback, useState } from 'react';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';

async function loadMedOptions(q: string): Promise<PickerOption[]> {
  const res = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search_med', q, limit: 8 }),
  });
  const data = await res.json();
  return ((data.items || []) as {
    name_en?: string;
    name_ar?: string;
    scientific_name?: string;
    price_egp?: number;
  }[]).map((it) => {
    const name = it.name_en || it.name_ar || '';
    return {
      value: name,
      label: name,
      sublabel: [
        it.scientific_name || null,
        it.name_ar && it.name_en ? it.name_ar : null,
        it.price_egp != null ? `${it.price_egp} EGP` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });
}

export function DdinterCheckForm() {
  const [drugs, setDrugs] = useState<string[]>(['Warfarin', 'Aspirin', 'Ibuprofen']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    error?: string;
    pair_db_count?: number;
    hits?: { level: string; drug_a: string; drug_b: string; matched_via: string }[];
  } | null>(null);

  const medLoader = useCallback((q: string) => loadMedOptions(q), []);

  function updateDrug(i: number, v: string) {
    setDrugs((prev) => prev.map((d, idx) => (idx === i ? v : d)));
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const list = drugs.map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/ddinter/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: list }),
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
    <form onSubmit={check} className="space-y-3 text-sm">
      <p className="text-xs text-slate-500">
        Search Egyptian catalog or type any name · ابحث في قاعدة الأدوية المصرية
      </p>
      {drugs.map((d, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1">
            <SearchablePicker
              value={d}
              onChange={(v) => updateDrug(i, v)}
              loadOptions={medLoader}
              learnKey="medicine"
              allowCreate
              minQueryLength={2}
              placeholder={`Drug ${i + 1}`}
              createLabel={(q) => `Use “${q}”`}
            />
          </div>
          {drugs.length > 2 && (
            <button
              type="button"
              onClick={() => setDrugs((prev) => prev.filter((_, j) => j !== i))}
              className="mt-2 text-xs text-red-600 hover:underline px-1"
              aria-label="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDrugs((prev) => [...prev, ''])}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          + Add drug
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-xs font-semibold disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Check interactions'}
        </button>
      </div>
      {result && (
        <div className="mt-2 space-y-2">
          {result.ok === false && (
            <p className="text-red-600 text-xs">{result.error}</p>
          )}
          {result.pair_db_count === 0 && (
            <p className="text-amber-700 text-xs">
              No pairs in DB — run Import first.
            </p>
          )}
          {result.hits?.length === 0 && (result.pair_db_count ?? 0) > 0 && (
            <p className="text-slate-500 text-xs">No DDInter hits for this list.</p>
          )}
          {result.hits?.map((h, i) => (
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
          ))}
        </div>
      )}
    </form>
  );
}
