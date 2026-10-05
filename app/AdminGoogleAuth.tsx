'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type StaffStatus = {
  neon_configured?: boolean;
  staff_ok?: boolean;
  staff_email?: string | null;
  allowlist_configured?: boolean;
  allowlist_count?: number;
};

const cred: RequestInit = { credentials: 'include' };

/**
 * Embedded Google (Neon Auth) controls for the Home admin panel.
 */
export function AdminGoogleAuth({
  nextPath,
  onStaffChange,
}: {
  nextPath?: string | null;
  onStaffChange?: (email: string | null, unlocked: boolean) => void;
}) {
  const [status, setStatus] = useState<StaffStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/staff-session', cred);
      const data = await res.json();
      setStatus(data);
      onStaffChange?.(data.staff_email || null, !!data.staff_ok);
    } catch {
      setStatus({ neon_configured: false });
    }
  }, [onStaffChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function continueGoogle() {
    setLoading(true);
    setMsg(null);
    try {
      const { createAuthClient } = await import('@neondatabase/auth/next');
      const client = createAuthClient();
      const next =
        nextPath && nextPath.startsWith('/')
          ? nextPath
          : '/';
      const { error } = await client.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/sign-in/callback?next=${encodeURIComponent(next)}`,
      });
      if (error) throw new Error(error.message || 'Google sign-in failed');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Google sign-in error');
      setLoading(false);
    }
  }

  async function openOps() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/staff-session', {
        ...cred,
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not allowlisted');
      setMsg(`Ops open · ${data.email}`);
      onStaffChange?.(data.email || null, true);
      await refresh();
      if (nextPath && nextPath.startsWith('/')) {
        window.location.href = nextPath;
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function signOutGoogle() {
    setLoading(true);
    try {
      await fetch('/api/auth/staff-session', { ...cred, method: 'DELETE' });
      try {
        const { createAuthClient } = await import('@neondatabase/auth/next');
        await createAuthClient().signOut?.();
      } catch {
        /* optional */
      }
      onStaffChange?.(null, false);
      await refresh();
      setMsg('Signed out');
    } finally {
      setLoading(false);
    }
  }

  const neon = status?.neon_configured !== false;
  const staffOk = !!status?.staff_ok;

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Admin panel · Neon Auth
          </p>
          <h3 className="text-sm font-semibold text-slate-900">Google staff access</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Sign in with an allowlisted Google account to open ops.
          </p>
        </div>
        {staffOk && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            Active
          </span>
        )}
      </div>

      {status == null && (
        <p className="text-xs text-slate-500">Checking session…</p>
      )}

      {status && !status.neon_configured && (
        <p className="text-xs text-amber-800">
          Set <code className="bg-white/80 px-1 rounded">NEON_AUTH_BASE_URL</code> +{' '}
          <code className="bg-white/80 px-1 rounded">NEON_AUTH_COOKIE_SECRET</code> +{' '}
          <code className="bg-white/80 px-1 rounded">OPS_ALLOWED_EMAILS</code> on Vercel.{' '}
          <Link href="/sign-in" className="underline">
            Setup page
          </Link>
        </p>
      )}

      {status?.neon_configured && !status.allowlist_configured && (
        <p className="text-xs text-amber-800">
          Add staff emails to{' '}
          <code className="bg-white/80 px-1 rounded">OPS_ALLOWED_EMAILS</code>.
        </p>
      )}

      {staffOk ? (
        <div className="space-y-2">
          <p className="text-xs text-emerald-800 font-medium">
            Signed in as {status?.staff_email}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={signOutGoogle}
            className="text-xs text-slate-600 underline disabled:opacity-50"
          >
            Sign out Google staff
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading || !neon}
            onClick={continueGoogle}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            {loading ? '…' : 'Sign in with Google'}
          </button>
          <button
            type="button"
            disabled={loading || !neon}
            onClick={openOps}
            className="w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
          >
            Already signed in? Activate ops session
          </button>
        </div>
      )}

      {msg && (
        <p className="text-[11px] text-slate-600 break-all" dir="auto">
          {msg}
        </p>
      )}

      <p className="text-[10px] text-slate-400">
        Full page:{' '}
        <Link href="/sign-in" className="text-violet-700 hover:underline">
          /sign-in
        </Link>
        {' · '}
        <Link href="/docs" className="hover:underline hidden">
          docs
        </Link>
        Allowlist size: {status?.allowlist_count ?? '—'}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.9 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
