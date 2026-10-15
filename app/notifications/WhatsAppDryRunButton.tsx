'use client';

import { useState } from 'react';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Dedicated WhatsApp dry-run control.
 * Never sends live messages — always forces dry_run: true.
 */
export function WhatsAppDryRunButton() {
  const period = currentPeriod();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'single' | 'due' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function secretHeaders(): HeadersInit {
    const secret =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('maa_process_secret') ||
          localStorage.getItem('maa_process_secret') ||
          ''
        : '';
    return {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-process-secret': secret } : {}),
    };
  }

  async function runSingle() {
    const to = phone.trim();
    if (!to) {
      setError('Enter a phone number for the single-message test');
      return;
    }
    setBusy('single');
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const message =
        `🧪 Dry-run test · تجربة واتساب\n` +
        `Period ${period}\n` +
        `This message was NOT sent live.\n` +
        `هذه رسالة تجريبية — لم تُرسل فعلياً.\n` +
        `— Medical aid`;
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: secretHeaders(),
        body: JSON.stringify({
          to,
          template: 'custom',
          message,
          dry_run: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(
        [
          'DRY-RUN OK',
          data.provider ? `provider=${data.provider}` : null,
          data.to ? `to=${data.to}` : `to=${to}`,
          data.message_id ? `id=${data.message_id}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      );
      setPreview(data.body || message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
    }
  }

  async function runDueBatch() {
    setBusy('due');
    setError(null);
    setResult(null);
    setPreview(null);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: secretHeaders(),
        body: JSON.stringify({
          action: 'notify_due',
          dry_run: true,
          period,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(
        [
          'DRY-RUN batch OK',
          `${data.ok_count ?? 0}/${data.attempted ?? 0} recipients`,
          data.provider ? `provider=${data.provider}` : null,
          `period=${data.period || period}`,
        ]
          .filter(Boolean)
          .join(' · ')
      );
      const sample = data.results?.[0];
      if (sample) {
        setPreview(
          JSON.stringify(
            {
              phone: sample.phone,
              ok: sample.ok,
              dry_run: sample.dry_run,
              error: sample.error,
            },
            null,
            2
          )
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          💬
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Safe · always dry-run
          </p>
          <h2 className="text-lg font-bold text-slate-900">
            WhatsApp dry-run
          </h2>
          <p className="text-sm text-slate-600">
            Simulate messages without sending. Use this before any live campaign.
          </p>
          <p className="text-xs text-slate-500" dir="rtl">
            تجربة واتساب بدون إرسال حقيقي — استخدمها قبل أي حملة مباشرة.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-700">
          Test phone · رقم للتجربة (optional for single test)
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01xxxxxxxxx or +20…"
          className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </label>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={runSingle}
          className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
        >
          {busy === 'single' ? 'Running…' : '▶ Dry-run one message'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={runDueBatch}
          className="flex-1 rounded-xl border-2 border-amber-500 bg-white px-4 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy === 'due' ? 'Running…' : `▶ Dry-run due batch (${period})`}
        </button>
      </div>

      {result && (
        <p
          className={`text-xs font-mono break-all rounded-lg px-3 py-2 ${
            result.startsWith('DRY-RUN')
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-slate-50 text-slate-700'
          }`}
        >
          {result}
        </p>
      )}
      {preview && (
        <pre className="text-[11px] whitespace-pre-wrap rounded-lg bg-white/90 border border-amber-100 p-3 text-slate-700 max-h-40 overflow-y-auto">
          {preview}
        </pre>
      )}
      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
