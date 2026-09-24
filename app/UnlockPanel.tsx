'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function UnlockPanel() {
  const search = useSearchParams();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [needsSecret, setNeedsSecret] = useState(false);
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showPrompt =
    search?.get('unlock') === '1' || search?.get('need_secret') === '1';

  useEffect(() => {
    fetch('/api/auth/unlock')
      .then((r) => r.json())
      .then((d) => {
        setUnlocked(!!d.unlocked);
        setNeedsSecret(d.open === false && !d.unlocked ? false : !d.unlocked);
        if (d.open) {
          // open mode removed — treat as locked until secret exists
          setNeedsSecret(true);
        }
      })
      .catch(() => setUnlocked(false));
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setUnlocked(true);
      setSecret('');
      const next = search?.get('next');
      if (next && next.startsWith('/')) {
        window.location.href = next;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function lock() {
    await fetch('/api/auth/unlock', { method: 'DELETE' });
    setUnlocked(false);
  }

  if (unlocked === null) return null;

  if (unlocked) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-emerald-700 font-medium">Ops unlocked</span>
        <button
          type="button"
          onClick={lock}
          className="text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Lock
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {(showPrompt || needsSecret) && (
        <p className="text-xs text-amber-700 max-w-xs">
          Ops pages are private. Enter PROCESS_SECRET to unlock, or set it on
          Vercel if missing.
        </p>
      )}
      <form onSubmit={unlock} className="flex flex-wrap items-center gap-2 text-sm">
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Ops password (PROCESS_SECRET)"
          className="rounded border px-2 py-1 text-sm"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-50"
        >
          {loading ? '…' : 'Unlock ops'}
        </button>
        {err && <span className="text-red-600 text-xs">{err}</span>}
      </form>
    </div>
  );
}
