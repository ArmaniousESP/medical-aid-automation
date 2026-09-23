'use client';

import { useState } from 'react';

export function SafetyAlertButton() {
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
            ? `No high flags (scanned ${data.scanned}). Nothing to send.`
            : `Skipped: ${data.reason}. Set SAFETY_WHATSAPP_TO on Vercel.`
        );
      } else {
        setMsg(
          `Flagged ${data.flagged}/${data.scanned} · sent to ${data.recipients} · ok ${data.ok_count}` +
            (data.sent?.[0]?.dry_run ? ' (dry run)' : '') +
            (data.sent?.[0]?.body ? `\nPreview: ${String(data.sent[0].body).slice(0, 180)}…` : '')
        );
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <h2 className="font-medium text-sm">Safety queue WhatsApp (ops)</h2>
      <p className="text-xs text-slate-600">
        Alerts <strong>staff</strong> phones in SAFETY_WHATSAPP_TO when cycles have
        DDInter Major or allergy High — not sent to patients.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(true)}
          className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Dry run
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run(false)}
          className="rounded bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Send safety alert
        </button>
      </div>
      {msg && (
        <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 border rounded p-2">
          {msg}
        </pre>
      )}
    </div>
  );
}
