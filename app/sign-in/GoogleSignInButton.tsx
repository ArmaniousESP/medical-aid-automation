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
        className="aid-cta-primary w-full min-h-[2.75rem] gap-2 px-4 text-sm disabled:opacity-50"
      >
        <GoogleGlyph />
        {loading ? 'Connecting…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={establishStaff}
        className="w-full min-h-[2.5rem] rounded-full border px-4 text-sm font-medium transition disabled:opacity-50"
        style={{
          borderColor: 'var(--aid-line)',
          background: 'var(--aid-paper)',
          color: 'var(--aid-ink)',
        }}
      >
        Already signed in? Open ops
      </button>
      {msg && (
        <p
          className="text-xs break-all rounded-xl px-3 py-2"
          style={{ color: 'var(--aid-muted)', background: 'var(--aid-paper)' }}
          dir="auto"
        >
          {msg}
        </p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.3 5.2C39.2 37.1 44 32 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
