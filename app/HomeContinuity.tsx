'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  draftHasContent,
  formatDraftAge,
  loadDraft,
  loadLastRequestId,
} from '@/lib/intakeDraft';

/**
 * Device-local continuity so beneficiaries never feel lost:
 * - unfinished draft → resume submit
 * - last Request ID → one-tap status
 */
export function HomeContinuity() {
  const [lastId, setLastId] = useState<string | null>(null);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLastId(loadLastRequestId());
    const d = loadDraft();
    if (d && draftHasContent(d)) {
      setDraftAge(formatDraftAge(d.savedAt));
    }
    setReady(true);
  }, []);

  if (!ready || (!lastId && !draftAge)) return null;

  return (
    <section
      className="space-y-2 aid-rise"
      aria-label="Continue on this device"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">
        On this device · على هذا الجهاز
      </p>

      {draftAge && (
        <Link
          href="/intake"
          className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/95 px-4 py-3.5 shadow-sm backdrop-blur hover:bg-sky-100 transition active:scale-[0.99]"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white text-lg"
            aria-hidden
          >
            ✎
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold text-sky-950">
              Resume unfinished form
            </span>
            <span className="block text-xs text-sky-800 mt-0.5" dir="rtl">
              أكمل المسودة المحفوظة
            </span>
            <span className="block text-[11px] text-sky-700/80 mt-1">
              Saved {draftAge}
            </span>
          </span>
          <span className="text-sky-700 font-semibold" aria-hidden>
            →
          </span>
        </Link>
      )}

      {lastId && (
        <Link
          href={`/request-status?id=${encodeURIComponent(lastId)}`}
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3.5 shadow-sm backdrop-blur hover:bg-emerald-100 transition active:scale-[0.99]"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white text-lg"
            aria-hidden
          >
            ✓
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold text-emerald-950">
              Check last request
            </span>
            <span className="block text-xs text-emerald-800 mt-0.5" dir="rtl">
              عرض حالة آخر طلب
            </span>
            <span className="block font-mono text-[11px] text-emerald-800/80 mt-1 truncate">
              {lastId.slice(0, 8)}…{lastId.slice(-4)}
            </span>
          </span>
          <span className="text-emerald-700 font-semibold" aria-hidden>
            →
          </span>
        </Link>
      )}
    </section>
  );
}
