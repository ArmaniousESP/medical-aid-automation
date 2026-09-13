'use client';

import { useEffect, useState } from 'react';

export function UnlockPanel() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/unlock')
      .then((r) => r.json())
      .then((d) => {
        setUnlocked(!!d.unlocked);
        setOpen(!!d.open);
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
  if (open) {
    return (
      <p className="text-xs text-slate-500">
        وضع مفتوح — لم يُضبط PROCESS_SECRET
      </p>
    );
  }

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={lock}
        className="text-xs text-slate-500 hover:text-slate-800 underline"
      >
        قفل الواجهة
      </button>
    );
  }

  return (
    <form onSubmit={unlock} className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="PROCESS_SECRET"
        className="rounded border px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-50"
      >
        {loading ? '…' : 'فتح الإدارة'}
      </button>
      {err && <span className="text-red-600 text-xs">{err}</span>}
    </form>
  );
}
