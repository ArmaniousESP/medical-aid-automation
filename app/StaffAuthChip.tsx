'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const cred: RequestInit = { credentials: 'include' };

/** Compact Google / staff session control for the staff nav strip */
export function StaffAuthChip() {
  const pathname = usePathname() || '/';
  const [email, setEmail] = useState<string | null>(null);
  const [neon, setNeon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/staff-session', cred);
      const data = await res.json();
      setEmail(data.staff_ok ? data.staff_email || null : null);
      setNeon(!!data.neon_configured);
    } catch {
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  async function googleIn() {
    setLoading(true);
    setMsg(null);
    try {
      const { createAuthClient } = await import('@neondatabase/auth/next');
      const client = createAuthClient();
      const next = pathname.startsWith('/') ? pathname : '/';
      const { error } = await client.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/sign-in/callback?next=${encodeURIComponent(next)}`,
      });
      if (error) throw new Error(error.message || 'Failed');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
      setLoading(false);
    }
  }

  async function activate() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/staff-session', {
        ...cred,
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not allowlisted');
      setEmail(data.email || null);
      setMsg(null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      await refresh();
    }
  }

  async function signOut() {
    setLoading(true);
    try {
      await fetch('/api/auth/staff-session', { ...cred, method: 'DELETE' });
      setEmail(null);
    } finally {
      setLoading(false);
    }
  }

  if (email) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        <span
          className="max-w-[9rem] truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900"
          title={email}
        >
          {email}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={signOut}
          className="text-[10px] text-slate-500 hover:underline disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 ml-auto">
      {neon ? (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={googleIn}
            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? '…' : 'Google'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={activate}
            className="rounded-full bg-violet-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-violet-800 disabled:opacity-50"
            title="Activate ops after Google session"
          >
            Activate
          </button>
        </>
      ) : (
        <Link
          href="/sign-in"
          className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800 hover:bg-violet-100"
        >
          Google setup
        </Link>
      )}
      {msg && (
        <span className="text-[9px] text-red-600 max-w-[8rem] truncate" title={msg}>
          {msg}
        </span>
      )}
    </div>
  );
}
