'use client';

import { useState } from 'react';

export function BatchReleaseButton({ period }: { period: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(dry: boolean) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/psp/release-letter/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, dry_run: dry, limit: 40 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(
        `${dry ? 'Dry run' : 'Issued'}: ${data.issued}/${data.attempted} for ${data.period}`
      );
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center text-sm">
      <button
        type="button"
        disabled={loading}
        onClick={() => run(true)}
        className="rounded bg-slate-700 px-3 py-1.5 text-white text-xs disabled:opacity-50"
      >
        Dry-run release letters
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => run(false)}
        className="rounded bg-indigo-600 px-3 py-1.5 text-white text-xs disabled:opacity-50"
      >
        Issue batch letters
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}
