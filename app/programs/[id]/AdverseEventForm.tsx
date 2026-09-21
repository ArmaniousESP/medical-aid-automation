'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <form onSubmit={submit} className="space-y-2 text-sm">
      <p className="text-xs text-slate-500">
        Report side effect or safety concern (PMS-style AE log).
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded border px-2 py-1.5"
        >
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
        <input
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          placeholder="Medication (optional)"
          className="rounded border px-2 py-1.5 flex-1 min-w-[120px]"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        rows={2}
        placeholder="What happened?"
        className="w-full rounded border px-2 py-1.5"
      />
      <input
        value={actionTaken}
        onChange={(e) => setActionTaken(e.target.value)}
        placeholder="Action taken (optional)"
        className="w-full rounded border px-2 py-1.5"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-red-700 px-3 py-1.5 text-white text-xs disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Log adverse event'}
      </button>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </form>
  );
}
