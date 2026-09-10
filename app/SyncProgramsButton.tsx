'use client';

import { useState } from 'react';

export function SyncProgramsButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/programs/sync-from-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(
        `مجموعات: ${data.groups} · جديد: ${data.created} · محدّث: ${data.updated} · تخطي: ${data.skipped}` +
          (data.errors?.length ? ` · أخطاء: ${data.errors.length}` : '')
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50 transition"
      >
        {loading ? 'جاري المزامنة…' : 'مزامنة البرامج المزمنة'}
      </button>
      {msg && <span className="text-xs text-emerald-700">{msg}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
