'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function UnlockPanel() {
  const search = useSearchParams();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [secretConfigured, setSecretConfigured] = useState(true);
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showPrompt =
    search?.get('unlock') === '1' || search?.get('need_secret') === '1';
  const nextPath = search?.get('next');

  useEffect(() => {
    fetch('/api/auth/unlock')
      .then((r) => r.json())
      .then((d) => {
        setUnlocked(!!d.unlocked);
        setSecretConfigured(d.secret_configured !== false);
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
      if (nextPath && nextPath.startsWith('/')) {
        window.location.href = nextPath;
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-emerald-700 font-medium">Ops unlocked</span>
          <button
            type="button"
            onClick={lock}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Lock
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Link
            href="/intake-ops"
            className="rounded-full bg-violet-100 text-violet-900 px-2.5 py-0.5 hover:bg-violet-200"
          >
            1. Queue
          </Link>
          <Link
            href="/claims"
            className="rounded-full bg-violet-100 text-violet-900 px-2.5 py-0.5 hover:bg-violet-200"
          >
            2. Claims
          </Link>
          <Link
            href="/pharmacy"
            className="rounded-full bg-violet-100 text-violet-900 px-2.5 py-0.5 hover:bg-violet-200"
          >
            3. Pharmacy
          </Link>
          <Link
            href="/guide#for-staff"
            className="rounded-full border px-2.5 py-0.5 text-violet-700 hover:bg-violet-50"
          >
            Staff guide
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showPrompt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Ops access required</p>
          <p className="mt-0.5">
            {nextPath
              ? `You tried to open ${nextPath}. Enter PROCESS_SECRET to continue.`
              : 'Enter PROCESS_SECRET to unlock queue, claims, and pharmacy.'}
          </p>
          {!secretConfigured && (
            <p className="mt-1 text-amber-800">
              PROCESS_SECRET is not set on Vercel yet — add it under Environment
              Variables, redeploy, then unlock here.
            </p>
          )}
        </div>
      )}
      <form onSubmit={unlock} className="flex flex-wrap items-center gap-2 text-sm">
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Ops password (PROCESS_SECRET)"
          className="rounded border px-2 py-1 text-sm min-w-[12rem]"
          autoComplete="current-password"
          autoFocus={showPrompt}
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
      <p className="text-[10px] text-slate-400">
        <Link href="/guide#for-staff" className="text-violet-700 hover:underline">
          Staff steps in the guide
        </Link>
      </p>
    </div>
  );
}
