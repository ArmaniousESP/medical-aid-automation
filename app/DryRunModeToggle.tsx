'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = {
  env_forces?: boolean;
  cookie_on?: boolean;
  effective?: boolean;
  can_toggle_off?: boolean;
};

export function DryRunModeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/dry-run-mode');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStatus(data);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setEnabled(enabled: boolean) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/ops/dry-run-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStatus(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
      await load();
    } finally {
      setLoading(false);
    }
  }

  const on = !!status?.effective;
  const lockedOn = !!status?.env_forces;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Dry-run</span>
        <button
          type="button"
          disabled={loading || lockedOn}
          onClick={() => setEnabled(!on)}
          className={`relative h-6 w-11 rounded-full transition ${
            on ? 'bg-amber-500' : 'bg-slate-300'
          } disabled:opacity-60`}
          title={lockedOn ? 'Forced by WHATSAPP_DRY_RUN env' : 'Toggle dry-run'}
          aria-pressed={on}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              on ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
        <span className={on ? 'text-amber-800 font-medium' : 'text-emerald-700'}>
          {on ? 'ON' : 'OFF'}
        </span>
        {err && <span className="text-red-600">{err}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">Dry-run mode</p>
          <p className="text-xs text-amber-900 mt-0.5">
            When ON, WhatsApp is logged only (no live send). Session toggle — does not
            change Vercel env.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || (on && lockedOn)}
          onClick={() => setEnabled(!on)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            on ? 'bg-amber-500' : 'bg-slate-300'
          } disabled:opacity-60`}
          aria-pressed={on}
          aria-label="Toggle dry-run mode"
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              on ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
      <p className="text-xs font-mono text-slate-700">
        {status == null
          ? '…'
          : on
            ? lockedOn
              ? 'ON (forced by WHATSAPP_DRY_RUN=1 on Vercel)'
              : 'ON (session cookie)'
            : 'OFF — live sends allowed if provider is configured'}
      </p>
      {lockedOn && (
        <p className="text-[11px] text-amber-800">
          To allow live: remove WHATSAPP_DRY_RUN from Vercel → Redeploy, then turn this
          toggle OFF.
        </p>
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
