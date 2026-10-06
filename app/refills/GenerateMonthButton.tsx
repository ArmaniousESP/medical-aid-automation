'use client';

import Link from 'next/link';
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
  const [created, setCreated] = useState(false);

  async function generate() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    setCreated(false);
    try {
      const res = await fetch('/api/refills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generate failed');
      setMsg(
        `Created ${data.created}, skipped ${data.skipped}` +
          (data.medDbSize != null ? ` · MEDDB3: ${data.medDbSize}` : '')
      );
      setCreated(true);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-slate-600 font-medium mb-1.5">
            Period · الفترة
          </span>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-base shadow-sm"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={generate}
          className="rounded-2xl bg-violet-700 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-violet-800 disabled:opacity-50"
        >
          {loading
            ? 'Generating… · جاري التوليد…'
            : 'Generate cycles · توليد الدورات'}
        </button>
      </div>
      {msg && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {err}
        </p>
      )}
      {created && (
        <Link
          href="/pharmacy"
          className="inline-block rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Open Pharmacy lists →
        </Link>
      )}
    </div>
  );
}
