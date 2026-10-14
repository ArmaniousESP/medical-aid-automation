'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LiveDryRunButton } from './LiveDryRunButton';
import { AdminGoogleAuth } from './AdminGoogleAuth';

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

  const refreshUnlock = useCallback(() => {
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

  useEffect(() => {
    refreshUnlock();
  }, [refreshUnlock]);

  function onStaffChange(email: string | null, staffUnlocked: boolean) {
    setStaffEmail(email);
    if (staffUnlocked) setUnlocked(true);
    else refreshUnlock();
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Unlock failed');
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
    await fetch('/api/auth/unlock', { method: 'DELETE', credentials: 'include' });
    try {
      await fetch('/api/auth/staff-session', { method: 'DELETE', credentials: 'include' });
    } catch {
      /* optional */
    }
    setUnlocked(false);
    setStaffEmail(null);
  }

  if (unlocked === null) {
    return <p className="text-xs text-slate-400 text-center py-2">Checking access…</p>;
  }

  if (unlocked) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/90 p-3 space-y-2 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-emerald-700 font-medium">
              Unlocked
              {staffEmail ? ` · Google · ${staffEmail}` : ' · secret'}
            </span>
            <button
              type="button"
              onClick={lock}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Lock · قفل
            </button>
          </div>
          <AdminGoogleAuth nextPath={nextPath} onStaffChange={onStaffChange} />
        </div>

        <p className="text-[10px] text-center text-slate-500 font-mono">
          Daily path · المسار اليومي
        </p>
        <ol className="space-y-1.5">
          {OPS_CHECKLIST.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="flex items-start gap-2 rounded-lg border border-violet-100 bg-white/90 px-3 py-2 hover:border-violet-300 hover:bg-violet-50 transition backdrop-blur"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-700 text-[11px] font-bold text-white">
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {s.title}{' '}
                    <span className="text-slate-400 font-normal" dir="rtl">
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
          href="/refills/safety"
          className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 hover:border-red-300 hover:bg-red-50 transition"
        >
          <span className="text-red-700 text-xs font-semibold">Safety queue</span>
          <span className="text-[11px] text-red-600/80">DDInter / allergy flags</span>
        </Link>

        <div className="pt-1">
          <LiveDryRunButton />
        </div>

        <div className="flex flex-wrap gap-2 justify-center text-[11px]">
          <Link href="/admin" className="text-violet-700 hover:underline">
            Admin
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/sign-in" className="text-violet-700 hover:underline">
            /sign-in
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/80 bg-white/90 p-4 space-y-3 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">Staff access · دخول التشغيل</h2>
        <p className="text-xs text-slate-600" dir="rtl">
          لوحة التشغيل · Google أو كلمة السر
        </p>

        {showPrompt && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">Ops access required</p>
            <p className="mt-0.5">
              Use Google (allowlisted) or PROCESS_SECRET below.
            </p>
          </div>
        )}

        <AdminGoogleAuth nextPath={nextPath} onStaffChange={onStaffChange} />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
            <span className="bg-white px-2 text-slate-400">or secret</span>
          </div>
        </div>

        <form onSubmit={unlock} className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="PROCESS_SECRET"
            className="aid-input min-w-[12rem] flex-1 py-2.5 text-sm"
            autoComplete="current-password"
            autoFocus={showPrompt}
          />
          <button
            type="submit"
            disabled={loading}
            className="aid-cta-violet px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? '…' : 'Unlock'}
          </button>
        </form>
        {err && <p className="text-red-600 text-xs">{err}</p>}
        {!secretConfigured && (
          <p className="text-[10px] text-amber-800">
            PROCESS_SECRET optional when Neon Auth + OPS_ALLOWED_EMAILS are set.
          </p>
        )}
      </div>
    </div>
  );
}
