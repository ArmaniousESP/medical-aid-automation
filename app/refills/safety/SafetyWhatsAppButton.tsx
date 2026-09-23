'use client';

import { useState } from 'react';

export function SafetyWhatsAppButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(dry_run: boolean) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notifications/safety-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run }),
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
            (data.sent?.[0]?.dry_run ? ' (dry run)' : '')
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
      <button
        type="button"
        disabled={loading}
        onClick={() => run(true)}
        className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
      >
        WA dry run
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => run(false)}
        className="rounded bg-red-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        WhatsApp ops alert
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}
