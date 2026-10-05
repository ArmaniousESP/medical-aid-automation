'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LiveDryRunButton } from './LiveDryRunButton';

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
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showPrompt =
    search?.get('unlock') === '1' || search?.get('need_secret') === '1';
  const nextPath = search?.get('next');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/unlock', cred).then((r) => r.json()),
      fetch('/api/auth/staff-session', cred).then((r) => r.json()),
    ])
      .then(([unlock, staff]) => {
        const staffOk = !!staff.staff_ok;
        setUnlocked(!!unlock.unlocked || staffOk);
        setSecretConfigured(unlock.secret_configured !== false);
        setStaffEmail(staff.staff_email || null);
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
    await Promise.all([
      fetch('/api/auth/unlock', { ...cred, method: 'DELETE' }),
      fetch('/api/auth/staff-session', { ...cred, method: 'DELETE' }),
    ]);
    setUnlocked(false);
    setStaffEmail(null);
  }

  if (unlocked === null) return null;

  if (unlocked) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-emerald-700 font-medium">
            Ops unlocked
            {staffEmail ? ` · ${staffEmail}` : ' · secret'}
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
          <span className="text-sm font-medium text-red-900">WhatsApp</span>
          <span className="text-[11px] text-red-700/80">Notifications</span>
        </Link>

        <div className="flex flex-wrap gap-2 text-[11px] justify-center pt-1">
          <Link href="/dry-run" className="text-amber-800 font-medium hover:underline">
            Dry-run script
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/sign-in" className="text-violet-700 hover:underline">
            Google staff
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/status" className="text-slate-600 hover:underline">
            Status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showPrompt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Ops access required</p>
          <p className="mt-0.5">
            Sign in with Google (allowlisted) or enter PROCESS_SECRET.
          </p>
        </div>
      )}

      <Link
        href={nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : '/sign-in'}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        Continue with Google (Neon Auth)
      </Link>

      <p className="text-center text-[10px] text-slate-400">or secret unlock</p>

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
      {!secretConfigured && (
        <p className="text-[10px] text-amber-800">
          PROCESS_SECRET optional if Neon Auth + OPS_ALLOWED_EMAILS are set.
        </p>
      )}
    </div>
  );
}
