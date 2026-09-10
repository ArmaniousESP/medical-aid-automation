'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function GenerateMonthButton() {
  const router = useRouter();
  const [period, setPeriod] = useState(currentPeriod);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/refills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generate failed');
      setMsg(
        `Created ${data.created}, skipped ${data.skipped}` +
          (data.medDbSize != null ? ` · MEDDB3 rows: ${data.medDbSize}` : '')
      );
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 shadow-sm">
      <label className="text-sm">
        <span className="block text-slate-500 mb-1">Period</span>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={generate}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'جاري التوليد…' : 'توليد دورة الشهر'}
      </button>
      {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      {err && <span className="text-sm text-red-600">{err}</span>}
    </div>
  );
}
