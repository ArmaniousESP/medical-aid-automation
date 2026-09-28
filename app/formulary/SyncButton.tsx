'use client';

import { useState } from 'react';

export function FormularySyncButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(source: 'programs' | 'all') {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/formulary/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(
        source === 'programs'
          ? `Programs: scanned ${data.scanned} · +${data.inserted} · ~${data.updated} · total ${data.total}`
          : `Sync done · total ${data.total} · +${data.inserted} (programs: ${data.from_programs?.inserted ?? 0})`
      );
      if (typeof window !== 'undefined') window.location.reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => run('programs')}
        className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {loading ? '…' : 'Sync from programs'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => run('all')}
        className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
      >
        Programs + MSH try
      </button>
      {msg && <span className="text-xs text-violet-900">{msg}</span>}
    </div>
  );
}
