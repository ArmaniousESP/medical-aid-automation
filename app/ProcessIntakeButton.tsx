'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  onDone?: () => void;
};

export function ProcessIntakeButton({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{
    enrolled?: number;
    claims?: number;
  } | null>(null);
  const [errors, setErrors] = useState<
    Array<{ step: string; message: string; code?: string; request_id?: string }>
  >([]);

  async function run(dryRun: boolean) {
    setLoading(true);
    setMsg(null);
    setErrors([]);
    setDone(false);
    try {
      const res = await fetch('/api/process-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok && !data.message) {
        throw new Error(data.error || 'process-intake failed');
      }
      setMsg(
        data.message ||
          `processed ${data.processed} · enrolled ${data.enrolled} · claims ${data.claims_created}`
      );
      setSummary({
        enrolled: data.enrolled,
        claims: data.claims_created,
      });
      if (Array.isArray(data.errors) && data.errors.length) {
        setErrors(
          data.errors.map((e: {
            step: string;
            message: string;
            code?: string;
            request_id?: string;
          }) => ({
            step: e.step,
            message: e.message,
            code: e.code,
            request_id: e.request_id,
          }))
        );
      }
      if (!dryRun) {
        setDone(true);
        onDone?.();
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => run(false)}
        className="w-full sm:w-auto rounded-2xl bg-violet-700 px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-violet-800 disabled:opacity-50"
      >
        {loading ? 'Processing… · جاري المعالجة…' : 'Process queue · معالجة الطابور'}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => run(true)}
        className="text-sm text-violet-800 underline self-start disabled:opacity-50"
      >
        Dry run only (no changes)
      </button>
      {msg && (
        <p className="text-sm text-slate-700 rounded-xl bg-white/80 border border-violet-100 px-3 py-2">
          {msg}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 max-w-lg">
          {errors.slice(0, 8).map((e, i) => (
            <li key={i}>
              <span className="font-mono">{e.step}</span>
              {e.code ? ` [${e.code}]` : ''}: {e.message}
              {e.request_id ? ` · ${String(e.request_id).slice(0, 8)}` : ''}
            </li>
          ))}
        </ul>
      )}
      {done && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-900">
            Done
            {summary?.enrolled != null ? ` · enrolled ${summary.enrolled}` : ''}
            {summary?.claims != null ? ` · claims ${summary.claims}` : ''}
          </p>
          <Link
            href="/claims"
            className="block w-full rounded-xl bg-violet-700 py-3 text-center text-sm font-semibold text-white hover:bg-violet-800"
          >
            Next: Claims → · المطالبات
          </Link>
        </div>
      )}
    </div>
  );
}
