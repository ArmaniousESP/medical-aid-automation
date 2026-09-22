'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DdinterImportButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run(codes?: string[]) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ddinter/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codes ? { codes } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const parts = (data.files || [])
        .map(
          (f: { code: string; inserted: number; error?: string }) =>
            `${f.code}:${f.error || '+' + f.inserted}`
        )
        .join(' ');
      setMsg(
        `Inserted ${data.total_inserted} · DB pairs ${data.stats?.pairs ?? '—'} · ${parts}`
      );
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(['B'])}
          className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          Import B only (blood — smaller)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Import all ATC files'}
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600 break-all">{msg}</p>}
    </div>
  );
}
