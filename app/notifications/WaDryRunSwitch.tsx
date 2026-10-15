'use client';

import { useDryRunMode } from './useDryRunMode';

/** Compact dry-run switch for embedding on every WhatsApp action card */
export function WaDryRunSwitch({
  className = '',
}: {
  className?: string;
}) {
  const { dryRun, locked, loading, error, setDryRun } = useDryRunMode();

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
        dryRun
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-emerald-200 bg-emerald-50 text-emerald-950'
      } ${className}`}
    >
      <span className="font-semibold uppercase tracking-wide">Dry-run</span>
      <button
        type="button"
        disabled={loading || locked}
        onClick={() => void setDryRun(!dryRun)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          dryRun ? 'bg-amber-500' : 'bg-slate-300'
        } disabled:opacity-60`}
        title={
          locked
            ? 'Forced by WHATSAPP_DRY_RUN env'
            : dryRun
              ? 'Dry-run ON — messages logged only'
              : 'Dry-run OFF — live sends allowed'
        }
        aria-pressed={dryRun}
        aria-label="Toggle WhatsApp dry-run"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            dryRun ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
      <span className="font-medium">{dryRun ? 'ON' : 'OFF (live)'}</span>
      {locked && (
        <span className="text-[10px] text-amber-800">env locked</span>
      )}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}

/** Resolve dry_run flag: global mode wins; live requires confirm when turning off */
export function resolveWhatsAppDryRun(
  globalDryRun: boolean,
  opts?: { forceDry?: boolean }
): boolean {
  if (opts?.forceDry) return true;
  return globalDryRun;
}

export function confirmLiveSend(actionLabel: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(
    `Send LIVE WhatsApp for: ${actionLabel}?\n\nDry-run is OFF. This will contact real numbers if a provider is configured.`
  );
}
