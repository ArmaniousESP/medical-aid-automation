'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LiveDryRunButton } from './LiveDryRunButton';

/** Same order as AppNav Staff path */
const OPS_CHECKLIST = [
  {
    n: 1,
    title: 'Intake queue',
    titleAr: 'طابور الطلبات',
    href: '/intake-ops',
    hint: 'Process submitted requests',
  },
  {
    n: 2,
    title: 'Claims',
    titleAr: 'المطالبات',
    href: '/claims',
    hint: 'Review drafts · Submit',
  },
  {
    n: 3,
    title: 'Pharmacy',
    titleAr: 'الصيدلية',
    href: '/pharmacy',
    hint: 'Available at Eva · Not Eva · CSV',
  },
  {
    n: 4,
    title: 'Programs',
    titleAr: 'البرامج',
    href: '/programs',
    hint: 'Chronic enrollments',
  },
  {
    n: 5,
    title: 'Refills',
    titleAr: 'الصرف الشهري',
    href: '/refills',
    hint: 'Monthly cycle · approve',
  },
];

const cred: RequestInit = { credentials: 'include' };

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
    fetch('/api/auth/unlock', cred)
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
        ...cred,
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
    await fetch('/api/auth/unlock', { ...cred, method: 'DELETE' });
    setUnlocked(false);
  }

  if (unlocked === null) return null;

  if (unlocked) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-emerald-700 font-medium">
            Ops unlocked · التشغيل مفتوح
          </span>
          <button
            type="button"
            onClick={lock}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Lock
          </button>
        </div>

        <LiveDryRunButton />

        <p className="text-[10px] text-center text-slate-500 font-mono">
          Queue → Claims → Pharmacy → Programs → Refills
        </p>

        <ol className="space-y-1.5">
          {OPS_CHECKLIST.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="flex items-start gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 hover:border-violet-300 hover:bg-violet-50 transition"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-700 text-[11px] font-bold text-white">
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {s.title}
                    <span className="text-slate-400 font-normal" dir="rtl">
                      {' '}
                      · {s.titleAr}
                    </span>
                  </span>
                  <span className="block text-[11px] text-slate-500">{s.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <Link
          href="/notifications"
          className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 hover:border-red-300 hover:bg-red-50 transition"
        >
          <span className="text-sm font-medium text-red-900">
            Twilio WhatsApp
          </span>
          <span className="text-[11px] text-red-700/80">
            Notifications · test send · due reminders
          </span>
        </Link>

        <div className="flex flex-wrap gap-2 text-[11px] justify-center pt-1">
          <Link href="/dry-run" className="text-amber-800 font-medium hover:underline">
            Full dry-run script
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/guide#for-staff" className="text-violet-700 hover:underline">
            Staff guide
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/status" className="text-slate-600 hover:underline">
            System status
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
