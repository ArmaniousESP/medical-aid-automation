'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'anaphylaxis', label: 'Anaphylaxis' },
];

export function AllergyPanel({
  programId,
  dependentId,
  initialAllergies,
  initialHits,
}: {
  programId: string;
  dependentId: string;
  initialAllergies: any[];
  initialHits: any[];
}) {
  const [label, setLabel] = useState('');
  const [severity, setSeverity] = useState('unknown');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/allergies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dependent_id: dependentId,
          allergen_label: label,
          severity,
          reaction_note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLabel('');
      setNote('');
      setMsg('Allergy saved');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    try {
      await fetch('/api/allergies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {initialHits.length > 0 && (
        <ul className="space-y-2">
          {initialHits.map((h, i) => (
            <li
              key={i}
              className={`rounded-xl border p-2 text-xs ${
                h.risk === 'high'
                  ? 'border-red-300 bg-red-50'
                  : h.risk === 'moderate'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className="font-semibold uppercase">{h.risk}</span>
              {' \u00b7 '}
              Allergy <strong>{h.allergy_label}</strong> vs med{' '}
              <strong>{h.med_name}</strong>
              {h.med_ingredient ? ` (${h.med_ingredient})` : ''}
              <p className="mt-1 text-slate-600">{h.message}</p>
            </li>
          ))}
        </ul>
      )}

      {initialAllergies.length === 0 && initialHits.length === 0 && (
        <p className="text-xs text-slate-500">No documented allergies yet.</p>
      )}

      {initialAllergies.length > 0 && (
        <ul className="text-xs space-y-1 border-t pt-2">
          {initialAllergies.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-2 items-center">
              <span className="font-medium">{a.allergen_label}</span>
              <span className="text-slate-500">{a.severity}</span>
              {a.reaction_note && (
                <span className="text-slate-400">{a.reaction_note}</span>
              )}
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-red-600 hover:underline"
                disabled={loading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-3 border-t pt-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Allergen
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
            placeholder="Penicillin / Sulfa / NSAID\u2026"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Severity
          </label>
          <SearchablePicker
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_OPTIONS}
            allowCreate={false}
            learnKey="allergy_severity"
            placeholder="Severity\u2026"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Note (optional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
            placeholder="Rash / SOB\u2026"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add allergy
        </button>
      </form>
      {msg && (
        <p className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          {msg}
        </p>
      )}
      <p className="text-[10px] text-slate-400">
        Cross-reactivity rules are triage heuristics (side-chain aware beta-lactams,
        sulfa, NSAID, \u2026). Not clinical decision support.
      </p>
    </div>
  );
}
