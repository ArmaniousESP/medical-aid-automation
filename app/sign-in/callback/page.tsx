'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function CallbackInner() {
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
    <div className="max-w-sm rounded-xl border bg-white p-6 shadow-sm text-center space-y-3">
      <p className="text-sm text-slate-700">{msg}</p>
      <Link href="/sign-in" className="text-xs text-violet-700 hover:underline">
        Back to sign-in
      </Link>
    </div>
  );
}

export default function SignInCallbackPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Completing sign-in…</p>
        }
      >
        <CallbackInner />
      </Suspense>
    </main>
  );
}
