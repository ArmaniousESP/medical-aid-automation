'use client';

import { useState } from 'react';
import { useDryRunMode } from './useDryRunMode';
import { WaDryRunSwitch, confirmLiveSend } from './WaDryRunSwitch';

export function SafetyAlertButton() {
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
            ? `No high flags (scanned ${data.scanned}). Nothing to send.`
            : `Skipped: ${data.reason}. Set SAFETY_WHATSAPP_TO on Vercel.`
        );
      } else {
        setMsg(
          `Flagged ${data.flagged}/${data.scanned} · sent to ${data.recipients} · ok ${data.ok_count}` +
            (useDry || data.sent?.[0]?.dry_run ? ' (dry run)' : ' (live)') +
            (data.sent?.[0]?.body
              ? `\nPreview: ${String(data.sent[0].body).slice(0, 180)}…`
              : '')
        );
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-sm text-slate-900">
            Safety queue WhatsApp (ops)
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Alerts <strong>staff</strong> phones in SAFETY_WHATSAPP_TO when cycles have
            DDInter Major or allergy High — not sent to patients.
          </p>
        </div>
        <WaDryRunSwitch />
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
          dryRun ? 'bg-slate-700' : 'bg-red-700 hover:bg-red-800'
        }`}
      >
        {loading ? '…' : dryRun ? '▶ Dry-run safety alert' : '▶ Send live safety alert'}
      </button>
      {msg && (
        <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 border rounded-lg p-2">
          {msg}
        </pre>
      )}
    </div>
  );
}
