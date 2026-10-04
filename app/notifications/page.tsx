import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { FlowSteps } from '../FlowSteps';
import { NotifyDueButton } from './NotifyDueButton';
import { SafetyAlertButton } from './SafetyAlertButton';
import { ReplayFailedButton } from './ReplayFailedButton';
import { EmailPanel } from './EmailPanel';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const status = whatsappConfigStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs text-violet-600 font-medium">
                More tools · Notifications
              </p>
              <h1 className="text-2xl font-semibold">WhatsApp & email alerts</h1>
              <p className="text-sm text-slate-600">
                Refill due · safety ops · email on process
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href="/refills" className="text-blue-600 hover:underline">
                ← Refills
              </Link>
              <Link
                href="/refills/safety"
                className="text-blue-600 hover:underline"
              >
                Safety queue
              </Link>
              <Link href="/guide#more-tools" className="text-violet-700 hover:underline">
                Guide
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm space-y-2">
          <p className="font-medium text-emerald-900">How WhatsApp alerts work</p>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-emerald-900 space-y-1">
            <li>
              Configure a provider on Vercel (Meta Cloud API <em>or</em> Twilio{' '}
              <em>or</em> webhook)
            </li>
            <li>
              <strong>Notify due refills</strong> — beneficiaries with a phone on
              active programs (template: refill_due)
            </li>
            <li>
              <strong>Safety alert</strong> — ops phones only (SAFETY_WHATSAPP_TO),
              never patients
            </li>
            <li>
              Start with <code className="bg-white/80 px-1 rounded">WHATSAPP_DRY_RUN=1</code>{' '}
              to log without sending
            </li>
          </ol>
          <p className="text-xs text-emerald-800" dir="rtl">
            تذكير الاستحقاق للمستفيد · تنبيه السلامة للفريق فقط · جرّب dry-run أولاً
          </p>
        </div>

        <EmailPanel />

        <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p className="font-medium">WhatsApp provider status</p>
          <p>
            <span className="text-slate-500">Mode: </span>
            <strong>{status.mode}</strong>
            {status.dry_run_default && (
              <span className="ml-2 text-amber-700">
                (dry-run — no live send until credentials + WHATSAPP_DRY_RUN off)
              </span>
            )}
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>
              Meta Cloud API: {status.has_meta ? '✓' : '—'} WHATSAPP_TOKEN +
              WHATSAPP_PHONE_NUMBER_ID
            </li>
            <li>
              Twilio: {status.has_twilio ? '✓' : '—'} TWILIO_ACCOUNT_SID +
              TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM
            </li>
            <li>
              Webhook: {status.has_webhook ? '✓' : '—'} WHATSAPP_WEBHOOK_URL
            </li>
            <li>
              Safety ops phones: {status.has_safety_to ? '✓' : '—'}{' '}
              SAFETY_WHATSAPP_TO
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
          <p className="font-medium">Setup (Vercel → Environment Variables)</p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
            <li>
              Pick one: Meta (<code>WHATSAPP_TOKEN</code>,{' '}
              <code>WHATSAPP_PHONE_NUMBER_ID</code>) or Twilio or{' '}
              <code>WHATSAPP_WEBHOOK_URL</code>
            </li>
            <li>
              Ops safety: <code>SAFETY_WHATSAPP_TO</code> = comma-separated phones
              (Egypt: 01xxxxxxxxx or 201…)
            </li>
            <li>
              Test: <code>WHATSAPP_DRY_RUN=1</code> → open this page → Notify due
              (dry) → check logs
            </li>
            <li>
              Live: remove dry-run · redeploy · run Notify due or Safety alert
            </li>
            <li>
              Cron: <code>/api/cron/whatsapp-due</code> and{' '}
              <code>/api/cron/safety-whatsapp</code> (see GitHub workflows)
            </li>
            <li>
              Email (optional): <code>RESEND_API_KEY</code>, <code>EMAIL_FROM</code>,{' '}
              <code>EMAIL_TO</code>
            </li>
          </ol>
          <p className="text-xs text-slate-500">
            Full notes: docs/whatsapp-setup.md in the repo
          </p>
        </div>
      </div>
    </main>
  );
}
