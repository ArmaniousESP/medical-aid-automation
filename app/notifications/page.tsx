import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { FlowSteps } from '../FlowSteps';
import { LiveDryRunButton } from '../LiveDryRunButton';
import { NotifyDueButton } from './NotifyDueButton';
import { SafetyAlertButton } from './SafetyAlertButton';
import { ReplayFailedButton } from './ReplayFailedButton';
import { EmailPanel } from './EmailPanel';
import { TwilioPanel } from './TwilioPanel';
import { MetaPanel } from './MetaPanel';

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
              <h1 className="text-2xl font-semibold">WhatsApp Business & alerts</h1>
              <p className="text-sm text-slate-600">
                Meta Cloud API · Twilio · refill due · safety
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
              <Link href="/dry-run" className="text-amber-800 hover:underline">
                Dry-run script
              </Link>
            </div>
          </div>
        </header>

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
              WHATSAPP_PROVIDER={status.provider_forced}
            </span>
          )}
          {status.dry_run_default && (
            <span className="text-xs text-amber-700 font-medium">
              Dry-run default
            </span>
          )}
        </div>

        <LiveDryRunButton />

        <MetaPanel
          active={metaActive}
          configured={!!status.has_meta}
          meta={status.meta_cloud}
          dryRunDefault={!!status.dry_run_default}
        />

        <TwilioPanel
          active={twilioActive}
          configured={!!status.has_twilio}
          twilio={status.twilio}
          dryRunDefault={!!status.dry_run_default}
        />

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm space-y-2">
          <p className="font-medium text-emerald-900">How Business API alerts work</p>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-emerald-900 space-y-1">
            <li>
              Configure <strong>Meta</strong> and/or <strong>Twilio</strong>
            </li>
            <li>
              Use <strong>Live dry-run</strong> above before any live Notify due
            </li>
            <li>
              Optional:{' '}
              <code className="bg-white/80 px-1 rounded">WHATSAPP_NOTIFY_ON_INTAKE=1</code>
            </li>
          </ol>
        </div>

        <EmailPanel />

        <SafetyAlertButton />

        <NotifyDueButton />

        <ReplayFailedButton />
      </div>
    </main>
  );
}
