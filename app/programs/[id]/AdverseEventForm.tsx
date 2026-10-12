'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'mild', label: 'Mild \u00b7 \u062e\u0641\u064a\u0641' },
  { value: 'moderate', label: 'Moderate \u00b7 \u0645\u062a\u0648\u0633\u0637' },
  { value: 'severe', label: 'Severe \u00b7 \u0634\u062f\u064a\u062f' },
];

export function AdverseEventForm({ programId }: { programId: string }) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [medName, setMedName] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/psp/ops', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adverse_event',
          program_id: programId,
          description,
          severity,
          med_name: medName || undefined,
          action_taken: actionTaken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg('Adverse event logged');
      setDescription('');
      setMedName('');
      setActionTaken('');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className="text-xs text-slate-500">
        Report side effect or safety concern (PMS-style AE log).
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Severity \u00b7 \u0627\u0644\u0634\u062f\u0629
        </label>
        <SearchablePicker
          value={severity}
          onChange={setSeverity}
          options={SEVERITY_OPTIONS}
          allowCreate={false}
          learnKey="ae_severity"
          placeholder="Severity\u2026"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Medication (optional)
        </label>
        <input
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          placeholder="Medication name"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          What happened?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Describe the event"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Action taken (optional)
        </label>
        <input
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="e.g. dose held, referred to physician"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
      >
        {loading ? 'Saving\u2026' : 'Log adverse event'}
      </button>

      {msg && (
        <p className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          {msg}
        </p>
      )}
    </form>
  );
}
