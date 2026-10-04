import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { FlowSteps } from '../FlowSteps';
import { NotifyDueButton } from './NotifyDueButton';
import { SafetyAlertButton } from './SafetyAlertButton';
import { ReplayFailedButton } from './ReplayFailedButton';
import { EmailPanel } from './EmailPanel';
import { TwilioPanel } from './TwilioPanel';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const status = whatsappConfigStatus();
  const twilioActive = status.mode === 'twilio';
  const metaActive = status.mode === 'meta';

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
                Twilio · Meta · refill due · safety ops
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
              <Link
                href="/guide#more-tools"
                className="text-violet-700 hover:underline"
              >
                Guide
              </Link>
            </div>
          </div>
        </header>

        {/* Active provider strip */}
        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Active channel
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.mode === 'none'
                ? 'bg-slate-100 text-slate-600'
                : status.mode === 'twilio'
                  ? 'bg-red-600 text-white'
                  : status.mode === 'meta'
                    ? 'bg-blue-600 text-white'
                    : 'bg-violet-600 text-white'
            }`}
          >
            {status.mode}
          </span>
          {status.provider_forced && (
            <span className="text-xs text-slate-500">
              forced via WHATSAPP_PROVIDER={status.provider_forced}
            </span>
          )}
          {status.dry_run_default && (
            <span className="text-xs text-amber-700 font-medium">
              Dry-run default (no live traffic)
            </span>
          )}
        </div>

        {/* Twilio dashboard card */}
        <TwilioPanel
          active={twilioActive}
          configured={!!status.has_twilio}
          twilio={status.twilio}
          dryRunDefault={!!status.dry_run_default}
        />

        {/* Meta compact status */}
        <div
          className={`rounded-xl border p-4 text-sm space-y-2 ${
            metaActive
              ? 'border-blue-200 bg-blue-50/50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-medium">Meta Cloud API</p>
            <span className="text-xs text-slate-500">
              {status.has_meta ? 'credentials set' : 'not set'}
              {metaActive ? ' · active' : ''}
            </span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>
              Token + Phone number ID: {status.has_meta ? '✓' : '—'}
            </li>
            <li>
              Template mode:{' '}
              {status.meta_cloud?.template_mode ? 'on' : 'off (session text)'}
            </li>
            <li>
              Graph: {status.meta_cloud?.graph_version || 'v21.0'}
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm space-y-2">
          <p className="font-medium text-emerald-900">How alerts work</p>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-emerald-900 space-y-1">
            <li>
              Prefer <strong>Twilio</strong> with{' '}
              <code className="bg-white/80 px-1 rounded">WHATSAPP_PROVIDER=twilio</code>{' '}
              or leave Meta as default if only Meta is set
            </li>
            <li>
              <strong>Notify due</strong> → beneficiaries with phone on active
              programs
            </li>
            <li>
              <strong>Safety alert</strong> → ops phones only
              (SAFETY_WHATSAPP_TO)
            </li>
            <li>
              Test with dry-run before live
            </li>
          </ol>
        </div>

        <EmailPanel />

        <SafetyAlertButton />

        <NotifyDueButton />

        <ReplayFailedButton />

        <div className="rounded-lg border bg-white p-4 text-sm text-slate-700 space-y-2">
          <p className="font-medium">Twilio setup checklist</p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
            <li>
              Twilio Console → Account SID, Auth Token, WhatsApp From
              (sandbox or approved sender)
            </li>
            <li>
              Vercel:{' '}
              <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>,{' '}
              <code>TWILIO_WHATSAPP_FROM</code>, optional{' '}
              <code>WHATSAPP_PROVIDER=twilio</code>
            </li>
            <li>
              Optional status URL:{' '}
              <code className="break-all">
                …/api/webhooks/twilio/whatsapp
              </code>
            </li>
            <li>
              Content templates outside 24h:{' '}
              <code>TWILIO_CONTENT_TEMPLATE_MODE=1</code> +{' '}
              <code>TWILIO_CONTENT_REFILL_DUE=HX…</code>
            </li>
            <li>
              Use the <strong>Twilio</strong> card above to dry-run a test phone
            </li>
          </ol>
          <p className="text-xs text-slate-500">
            Full notes: docs/whatsapp-setup.md
          </p>
        </div>
      </div>
    </main>
  );
}
