'use client';

import { useState } from 'react';

type MetaCloud = {
  graph_version?: string;
  template_mode?: boolean;
  template_lang?: string;
  webhook_verify_token_set?: boolean;
};

export function MetaPanel({
  active,
  configured,
  meta,
  dryRunDefault,
}: {
  active: boolean;
  configured: boolean;
  meta?: MetaCloud | null;
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
            'Test from Medical Aid · Meta Cloud API · رسالة تجريبية',
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
          ? 'border-blue-200 bg-blue-50/50'
          : configured
            ? 'border-slate-200 bg-white'
            : 'border-dashed border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            WhatsApp Business API
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Meta Cloud API
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Graph {meta?.graph_version || 'v21.0'} · official Business Platform
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            active
              ? 'bg-blue-600 text-white'
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
          Token + Phone number ID:{' '}
          {configured ? (
            <span className="text-emerald-700">✓</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </li>
        <li>
          Approved templates:{' '}
          {meta?.template_mode ? (
            <span className="text-emerald-700">on ({meta.template_lang || 'ar'})</span>
          ) : (
            <span className="text-slate-400">off (24h session text)</span>
          )}
        </li>
        <li>
          Webhook verify token:{' '}
          {meta?.webhook_verify_token_set ? (
            <span className="text-emerald-700">✓</span>
          ) : (
            <span className="text-slate-400">optional</span>
          )}
        </li>
        <li>
          Callback:{' '}
          <code className="text-[10px]">/api/webhooks/whatsapp</code>
        </li>
      </ul>

      {!configured && (
        <div className="rounded-lg bg-white/80 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-800">Vercel env</p>
          <code className="block text-[11px] leading-relaxed whitespace-pre-wrap">
            {`WHATSAPP_TOKEN=EAAG…
WHATSAPP_PHONE_NUMBER_ID=…
WHATSAPP_VERIFY_TOKEN=random-string
WHATSAPP_META_TEMPLATE_MODE=1
WA_TEMPLATE_LANG=ar`}
          </code>
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
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
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
