'use client';

import { useState } from 'react';
import { useDryRunMode } from '@/app/notifications/useDryRunMode';
import {
  WaDryRunSwitch,
  confirmLiveSend,
} from '@/app/notifications/WaDryRunSwitch';

export function SafetyWhatsAppButton() {
  const { dryRun } = useDryRunMode();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    const useDry = dryRun;
    if (!useDry && !confirmLiveSend('safety queue ops alert')) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notifications/safety-alert', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: useDry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.skipped) {
        setMsg(
          data.reason === 'no_flags'
            ? 'No flags — nothing sent'
            : `Skipped: ${data.reason}`
        );
      } else {
        setMsg(
          `Alerted ${data.ok_count}/${data.recipients} · flagged ${data.flagged}` +
            (useDry || data.sent?.[0]?.dry_run ? ' (dry run)' : ' (live)')
        );
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WaDryRunSwitch />
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
          dryRun ? 'bg-slate-700' : 'bg-red-700'
        }`}
      >
        {loading ? '…' : dryRun ? 'WA dry-run' : 'WhatsApp ops alert'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}
