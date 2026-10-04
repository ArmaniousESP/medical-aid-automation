import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { FlowSteps } from '../FlowSteps';
import { DryRunModeToggle } from '../DryRunModeToggle';
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
  const dry = status.dry_run_mode;

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
                Meta · Twilio · dry-run toggle · refill due
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href="/refills" className="text-blue-600 hover:underline">
                ← Refills
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
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.dry_run_default
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {status.dry_run_default ? 'dry-run ON' : 'live allowed'}
          </span>
          {dry?.env_forces && (
            <span className="text-xs text-amber-700">env WHATSAPP_DRY_RUN</span>
          )}
        </div>

        <DryRunModeToggle />

        <LiveDryRunButton showToggle={false} />

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

        <EmailPanel />

        <SafetyAlertButton />

        <NotifyDueButton />

        <ReplayFailedButton />
      </div>
    </main>
  );
}
