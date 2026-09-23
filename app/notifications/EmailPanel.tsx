'use client';

import { useEffect, useState } from 'react';

export function EmailPanel() {
  const [status, setStatus] = useState<any>(null);
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications/email')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, []);

  async function sendTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          to: to || undefined,
          subject: 'Medical aid — test email',
          text: 'Test from medical-aid-automation. Email channel is working.',
          html: '<p>Test from <strong>medical-aid-automation</strong>. Email channel is working.</p>',
        }),
      });
      const data = await res.json();
      setResult(
        data.ok
          ? `Sent (id: ${data.id || 'ok'})`
          : `Failed: ${data.error || 'unknown'}`
      );
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3 text-sm">
      <h2 className="font-medium">Email (Resend)</h2>
      <div className="text-xs text-slate-600 space-y-1">
        <div>
          Configured:{' '}
          <strong className={status?.configured ? 'text-emerald-700' : 'text-amber-700'}>
            {status?.configured ? 'yes' : 'no'}
          </strong>
        </div>
        <div>Default to: {(status?.default_to || []).join(', ') || '—'}</div>
        <div>
          Notify on process:{' '}
          {status?.notify_on_process ? 'yes' : 'no (set EMAIL_NOTIFY_ON_PROCESS=true)'}
        </div>
      </div>
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Optional override: you@org.com"
        className="w-full rounded border px-3 py-2 text-xs"
      />
      <button
        type="button"
        disabled={loading}
        onClick={sendTest}
        className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send test email'}
      </button>
      {result && <p className="text-xs text-slate-700">{result}</p>}
      <pre className="text-[10px] bg-slate-50 border rounded p-2 overflow-x-auto">
        {`RESEND_API_KEY=
EMAIL_FROM=Medical Aid <ops@yourdomain.com>
EMAIL_TO=ops@org.com,pharmacy@org.com
EMAIL_NOTIFY_ON_PROCESS=true
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`}
      </pre>
    </div>
  );
}
