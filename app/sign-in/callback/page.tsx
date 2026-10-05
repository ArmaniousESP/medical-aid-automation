'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Completing sign-in…');

  useEffect(() => {
    const next =
      search?.get('next') && search.get('next')!.startsWith('/')
        ? search.get('next')!
        : '/';

    (async () => {
      try {
        const res = await fetch('/api/auth/staff-session', {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setMsg(data.error || 'Not allowed');
          return;
        }
        setMsg(`Welcome ${data.email}`);
        router.replace(next);
      } catch (e: unknown) {
        setMsg(e instanceof Error ? e.message : 'Error');
      }
    })();
  }, [search, router]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="max-w-sm rounded-xl border bg-white p-6 shadow-sm text-center space-y-3">
        <p className="text-sm text-slate-700">{msg}</p>
        <Link href="/sign-in" className="text-xs text-violet-700 hover:underline">
          Back to sign-in
        </Link>
      </div>
    </main>
  );
}
