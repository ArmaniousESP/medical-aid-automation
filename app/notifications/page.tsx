import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { FlowSteps } from '../FlowSteps';
import { DryRunModeToggle } from '../DryRunModeToggle';
import { LiveDryRunButton } from '../LiveDryRunButton';
import { NotifyDueButton } from './NotifyDueButton';
import { RenewalCampaignButton } from './RenewalCampaignButton';
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
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="aid-section-label">More tools · Notifications</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                WhatsApp & alerts
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                واتساب · ميتا / تويليو · تجريبي · تنبيهات الصرف
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/refills"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                ← Refills
              </Link>
              <Link
                href="/safety"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                Safety
              </Link>
              <Link
                href="/dry-run"
                className="rounded-xl bg-amber-100 px-3 py-2 font-medium text-amber-950 hover:bg-amber-200"
              >
                Dry-run
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm flex flex-wrap items-center gap-3 text-sm backdrop-blur">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Active channel · القناة
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
        <RenewalCampaignButton />

        <ReplayFailedButton />
      </div>

      <div className="aid-sticky-bar">
        <div className="mx-auto max-w-3xl flex gap-2">
          <Link
            href="/refills"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Refills
          </Link>
          <Link href="/safety" className="aid-cta-violet flex-1 py-3 text-center text-sm">
            Safety →
          </Link>
        </div>
      </div>
    </main>
  );
}
