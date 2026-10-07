'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BrandMark } from './BrandMark';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark size="md" showTitle={false} />
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600" dir="rtl">
          حدث خطأ — حاول مرة أخرى
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-400">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Try again · أعد المحاولة
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
