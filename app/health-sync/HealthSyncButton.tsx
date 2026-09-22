'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function HealthSyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run(dry: boolean) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/health-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dry, trigger: dry ? 'ui-dry' : 'ui' }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error || data.errors?.[0]?.error || 'Failed');
      }
      const s = data.sync as {
        created?: number;
        updated?: number;
        groups?: number;
      } | null;
      const p = data.process as { newRows?: number } | null;
      setMsg(
        `${data.ok ? 'OK' : 'Partial'} · ${data.duration_ms}ms` +
          (p ? ` · process +${p.newRows ?? 0}` : '') +
          (s
            ? ` · programs created ${s.created ?? 0} updated ${s.updated ?? 0}`
            : '') +
          (data.errors?.length
            ? ` · warnings: ${data.errors.map((e: { error: string }) => e.error).join('; ')}`
            : '')
      );
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        disabled={loading}
        onClick={() => run(true)}
        className="rounded bg-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Dry run (process only)
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => run(false)}
        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Full health sync'}
      </button>
      {msg && <p className="text-xs text-slate-600 w-full">{msg}</p>}
    </div>
  );
}
