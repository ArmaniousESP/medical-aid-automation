'use client';

import { useState } from 'react';

type TwilioStatus = {
  content_template_mode?: boolean;
  has_messaging_service?: boolean;
  has_status_callback?: boolean;
};

export function TwilioPanel({
  active,
  configured,
  twilio,
  dryRunDefault,
}: {
  active: boolean;
  configured: boolean;
  twilio?: TwilioStatus | null;
  dryRunDefault: boolean;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function testSend(dry: boolean) {
    if (!phone.trim()) {
      setResult('Enter a phone (01xxxxxxxxx or 201…)');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone.trim(),
          template: 'custom',
          message:
            'Test from Medical Aid platform · رسالة تجريبية من منصة دعم العلاج',
          dry_run: dry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(
        [
          data.dry_run || dry ? 'Dry-run' : 'Sent',
          data.provider ? `provider=${data.provider}` : '',
          data.message_id ? `id=${data.message_id}` : '',
          data.error || '',
        ]
          .filter(Boolean)
          .join(' · ')
      );
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm space-y-3 ${
        active
          ? 'border-red-200 bg-red-50/40'
          : configured
            ? 'border-slate-200 bg-white'
            : 'border-dashed border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Twilio WhatsApp
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {active ? 'Active provider' : configured ? 'Configured' : 'Not configured'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Messages API · sandbox or production sender
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            active
              ? 'bg-red-600 text-white'
              : configured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
          }`}
        >
          {active ? 'LIVE path' : configured ? 'Ready' : 'Set env'}
        </span>
      </div>

      <ul className="grid gap-1.5 text-xs text-slate-700 sm:grid-cols-2">
        <li>
          Account SID + Auth Token:{' '}
          {configured ? (
            <span className="text-emerald-700">✓</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </li>
        <li>
          From / Messaging Service:{' '}
          {configured ? (
            <span className="text-emerald-700">✓</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </li>
        <li>
          Content templates:{' '}
          {twilio?.content_template_mode ? (
            <span className="text-emerald-700">on</span>
          ) : (
            <span className="text-slate-400">off (session body)</span>
          )}
        </li>
        <li>
          Status callback:{' '}
          {twilio?.has_status_callback ? (
            <span className="text-emerald-700">✓</span>
          ) : (
            <span className="text-slate-400">optional</span>
          )}
        </li>
      </ul>

      {!configured && (
        <div className="rounded-lg bg-white/80 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-800">Vercel env</p>
          <code className="block text-[11px] leading-relaxed">
            TWILIO_ACCOUNT_SID=AC…{'\n'}
            TWILIO_AUTH_TOKEN=…{'\n'}
            TWILIO_WHATSAPP_FROM=whatsapp:+14155238886{'\n'}
            WHATSAPP_PROVIDER=twilio
          </code>
          <p className="text-slate-500">
            Sandbox: join from the phone Twilio shows, then test below.
          </p>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-800">Test send</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx or 201…"
            className="rounded border px-3 py-1.5 text-sm min-w-[10rem] flex-1"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => testSend(true)}
            className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Dry run
          </button>
          <button
            type="button"
            disabled={loading || dryRunDefault}
            onClick={() => testSend(false)}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            title={dryRunDefault ? 'WHATSAPP_DRY_RUN is on or provider missing' : ''}
          >
            Send live
          </button>
        </div>
        {result && (
          <p className="text-xs text-slate-600 break-all" dir="auto">
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
