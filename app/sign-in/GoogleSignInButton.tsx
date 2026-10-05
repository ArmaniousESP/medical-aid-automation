'use client';

import { useState } from 'react';
import { createAuthClient } from '@neondatabase/auth/next';

export function GoogleSignInButton({ nextPath }: { nextPath: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signInGoogle() {
    setLoading(true);
    setMsg(null);
    try {
      const client = createAuthClient();
      const { error } = await client.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/sign-in/callback?next=${encodeURIComponent(nextPath)}`,
      });
      if (error) throw new Error(error.message || 'Google sign-in failed');
      // Redirect is handled by the auth client when successful
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
      setLoading(false);
    }
  }

  async function establishStaff() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/staff-session', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Staff session failed');
      setMsg(`Signed in as ${data.email}`);
      window.location.href = nextPath.startsWith('/') ? nextPath : '/';
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={signInGoogle}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? '…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={establishStaff}
        className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
      >
        Already signed in? Open ops
      </button>
      {msg && (
        <p className="text-xs text-slate-600 break-all" dir="auto">
          {msg}
        </p>
      )}
    </div>
  );
}
