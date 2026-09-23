import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { NotifyDueButton } from './NotifyDueButton';
import { SafetyAlertButton } from './SafetyAlertButton';
import { ReplayFailedButton } from './ReplayFailedButton';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const status = whatsappConfigStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">WhatsApp notifications</h1>
            <p className="text-sm text-slate-600">
              Refill due · Safety ops · Retry / replay
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/refills/safety" className="text-blue-600 hover:underline">
              Safety queue
            </Link>
            <Link href="/care-line" className="text-blue-600 hover:underline">
              Care Line
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Provider: </span>
            <strong>{status.mode}</strong>
            {status.dry_run_default && (
              <span className="ml-2 text-amber-700">(dry-run default — no live send)</span>
            )}
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>Meta Cloud API: {status.has_meta ? '✓' : '—'} WHATSAPP_TOKEN + PHONE_NUMBER_ID</li>
            <li>Twilio: {status.has_twilio ? '✓' : '—'} TWILIO_* + TWILIO_WHATSAPP_FROM</li>
            <li>Webhook: {status.has_webhook ? '✓' : '—'} WHATSAPP_WEBHOOK_URL</li>
            <li>
              Safety ops phones: {status.has_safety_to ? '✓' : '—'} SAFETY_WHATSAPP_TO
            </li>
            {status.retry && (
              <li>
                HTTP retry: {status.retry.maxAttempts} attempts · base{' '}
                {status.retry.baseDelayMs}ms · max {status.retry.maxDelayMs}ms
              </li>
            )}
          </ul>
          <p className="text-xs text-slate-500">
            Templates: {status.templates.join(', ')}
          </p>
        </div>

        <SafetyAlertButton />

        <NotifyDueButton />

        <ReplayFailedButton />

        <div className="rounded-lg border bg-white p-4 text-sm text-slate-700 space-y-2">
          <p className="font-medium">Setup (Vercel env)</p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
            <li>Configure Meta or Twilio WhatsApp credentials</li>
            <li>
              Set <code>SAFETY_WHATSAPP_TO</code> to ops phones (comma-separated)
            </li>
            <li>
              Retry: <code>WEBHOOK_RETRY_ATTEMPTS</code>,{' '}
              <code>WEBHOOK_RETRY_BASE_MS</code>, <code>WEBHOOK_RETRY_MAX_MS</code>
            </li>
            <li>Optional: WHATSAPP_DRY_RUN=1 for testing</li>
            <li>
              Replay API: POST /api/notifications/replay · list GET same path
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
