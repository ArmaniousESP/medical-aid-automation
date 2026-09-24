'use client';

import { useState } from 'react';

export function ProcessIntakeButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Array<{ step: string; message: string; code?: string; request_id?: string }>
  >([]);

  async function run(dryRun: boolean) {
    setLoading(true);
    setMsg(null);
    setErrors([]);
    try {
      const res = await fetch('/api/process-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok && !data.message) {
        throw new Error(data.error || 'process-intake failed');
      }
      setMsg(
        data.message ||
          `processed ${data.processed} · enrolled ${data.enrolled} · claims ${data.claims_created}`
      );
      if (Array.isArray(data.errors) && data.errors.length) {
        setErrors(
          data.errors.map((e: any) => ({
            step: e.step,
            message: e.message,
            code: e.code,
            request_id: e.request_id,
          }))
        );
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true)}
          className="px-5 py-2.5 rounded-lg bg-violet-100 text-violet-900 hover:bg-violet-200 font-medium disabled:opacity-50 transition text-sm"
        >
          {loading ? '…' : 'Intake dry run'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(false)}
          className="px-5 py-2.5 rounded-lg bg-violet-700 text-white hover:bg-violet-800 font-medium disabled:opacity-50 transition text-sm"
        >
          {loading ? 'Processing…' : 'Process platform intake'}
        </button>
      </div>
      {msg && (
        <p className="text-xs text-slate-600 max-w-md">{msg}</p>
      )}
      {errors.length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 max-w-md space-y-1">
          {errors.slice(0, 8).map((e, i) => (
            <li key={i}>
              <span className="font-mono">{e.step}</span>
              {e.code ? ` [${e.code}]` : ''}: {e.message}
              {e.request_id ? ` · ${String(e.request_id).slice(0, 8)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
