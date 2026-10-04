import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { bitrixConfigStatus } from '@/lib/bitrix';
import { FlowSteps } from '../FlowSteps';
import { DryRunActions } from './DryRunActions';

export const dynamic = 'force-dynamic';

function periodNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function loadCounts(period: string) {
  const out = {
    pendingIntake: '—',
    programs: '—',
    openCycles: '—',
    claims: '—',
  };
  if (!process.env.DATABASE_URL) return out;
  try {
    const { query } = await import('@/lib/db');
    try {
      const ar = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM aid_requests
         WHERE status IN ('submitted','triage')`
      );
      out.pendingIntake = ar.rows[0]?.n ?? '0';
    } catch {
      /* table may not exist yet */
    }
    try {
      const p = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM chronic_programs WHERE status = 'active'`
      );
      out.programs = p.rows[0]?.n ?? '0';
    } catch {
      /* */
    }
    try {
      const rc = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM refill_cycles
         WHERE period = $1
           AND status IS DISTINCT FROM 'dispensed'
           AND status IS DISTINCT FROM 'cancelled'`,
        [period]
      );
      out.openCycles = rc.rows[0]?.n ?? '0';
    } catch {
      /* */
    }
    try {
      const c = await query<{ n: string }>(
        `SELECT count(*)::text AS n FROM claims WHERE status IN ('draft','submitted','in_review')`
      );
      out.claims = c.rows[0]?.n ?? '0';
    } catch {
      /* */
    }
  } catch {
    /* */
  }
  return out;
}

const STEPS: {
  n: number | string;
  title: string;
  titleAr: string;
  href: string;
  do: string;
  expect: string;
}[] = [
  {
    n: 0,
    title: 'Unlock ops',
    titleAr: 'فتح التشغيل',
    href: '/',
    do: 'Home → enter PROCESS_SECRET → Unlock ops',
    expect: 'Checklist Queue → Claims → Pharmacy → Programs → Refills appears',
  },
  {
    n: '✓',
    title: 'System status',
    titleAr: 'حالة النظام',
    href: '/status',
    do: 'Confirm DATABASE_URL, PROCESS_SECRET, Neon OK',
    expect: 'Green “Database ready” and monthly path visible',
  },
  {
    n: 1,
    title: 'Queue',
    titleAr: 'طابور الطلبات',
    href: '/intake-ops',
    do: 'Open pending rows · process one test request (or skip if zero)',
    expect: 'Pending count drops or row moves out of submitted/triage',
  },
  {
    n: 2,
    title: 'Claims',
    titleAr: 'المطالبات',
    href: '/claims',
    do: 'Open drafts · review · do not submit live batch unless intentional',
    expect: 'Draft list loads without error',
  },
  {
    n: 3,
    title: 'Pharmacy',
    titleAr: 'الصيدلية',
    href: '/pharmacy',
    do: `Filter period · EVA then Not EVA · open CSV links · do NOT click live batch yet`,
    expect: 'Pick list groups load; filters work',
  },
  {
    n: '3b',
    title: 'EVA split',
    titleAr: 'تقسيم إيفا',
    href: '/eva-split',
    do: 'Confirm split view / exports',
    expect: 'Available at EVA vs Not Eva lists visible',
  },
  {
    n: 4,
    title: 'Programs',
    titleAr: 'البرامج',
    href: '/programs',
    do: 'Scan active chronic programs',
    expect: 'Program list loads',
  },
  {
    n: 5,
    title: 'Refills',
    titleAr: 'الصرف',
    href: '/refills',
    do: 'Open current period cycles · peek safety queue (read-only for dry-run)',
    expect: 'Cycles list for period loads',
  },
  {
    n: 'WA',
    title: 'WhatsApp dry-run',
    titleAr: 'واتساب تجريبي',
    href: '/notifications',
    do: 'Use buttons on this page (or Notifications) with dry_run only',
    expect: 'ok_count / attempted logged; no real WhatsApp if dry-run',
  },
];

export default async function DryRunPage() {
  const period = periodNow();
  const counts = await loadCounts(period);
  const wa = whatsappConfigStatus();
  const bx = bitrixConfigStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs text-amber-700 font-medium">
                Ops practice · no live pharmacy batch · WhatsApp dry-run only
              </p>
              <h1 className="text-2xl font-semibold">Live dry-run script</h1>
              <p className="text-sm text-slate-600" dir="rtl">
                سيناريو تجريبي لهذا الشهر — بدون إرسال واتساب حقيقي من أزرار هذه الصفحة
              </p>
            </div>
            <Link href="/status" className="text-sm text-blue-600 hover:underline">
              System status
            </Link>
          </div>
        </header>

        <div className="rounded-xl border bg-white p-4 shadow-sm grid gap-2 sm:grid-cols-2 text-sm">
          <p>
            <span className="text-slate-500">Period</span>{' '}
            <strong className="font-mono">{period}</strong>
          </p>
          <p>
            <span className="text-slate-500">WhatsApp</span>{' '}
            <strong>{wa.mode}</strong>
            {wa.dry_run_default ? ' · dry-run default' : ''}
          </p>
          <p>
            <span className="text-slate-500">Pending intake</span>{' '}
            <strong>{counts.pendingIntake}</strong>
          </p>
          <p>
            <span className="text-slate-500">Open cycles</span>{' '}
            <strong>{counts.openCycles}</strong>
          </p>
          <p>
            <span className="text-slate-500">Active programs</span>{' '}
            <strong>{counts.programs}</strong>
          </p>
          <p>
            <span className="text-slate-500">Open claims</span>{' '}
            <strong>{counts.claims}</strong>
          </p>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Bitrix:{' '}
            {bx.sync_on_intake
              ? bx.configured
                ? 'sync on intake ON'
                : 'sync ON but webhook missing'
              : 'off (optional)'}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
          <p className="font-semibold">Out of scope for this dry-run</p>
          <ul className="list-disc list-inside">
            <li>Do not click Pharmacy “Approve + dispense batch” (that is live)</li>
            <li>Do not turn off WHATSAPP_DRY_RUN until a dry-run log looks correct</li>
            <li>Do not message patients with live Send until Meta/Twilio test succeeds</li>
          </ul>
        </div>

        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li
              key={String(s.n) + s.href}
              className="rounded-xl border bg-white p-4 shadow-sm space-y-2"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-violet-700 px-1.5 text-xs font-bold text-white">
                  {s.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {s.title}{' '}
                    <span className="text-slate-400 font-normal" dir="rtl">
                      · {s.titleAr}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="font-medium text-slate-800">Do: </span>
                    {s.do}
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    <span className="font-medium">Expect: </span>
                    {s.expect}
                  </p>
                  <Link
                    href={s.href}
                    className="inline-block mt-2 text-xs font-medium text-violet-700 hover:underline"
                  >
                    Open {s.href} →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <DryRunActions period={period} />

        <div className="rounded-xl border bg-white p-4 text-sm space-y-2">
          <p className="font-medium">After dry-run looks good</p>
          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
            <li>Process real Queue items for the month</li>
            <li>Pharmacy: export EVA / Not Eva CSVs, then live batch when pharmacy confirms</li>
            <li>Remove WHATSAPP_DRY_RUN (or set 0), redeploy, Notify due for real</li>
          </ol>
          <p className="text-xs text-slate-500">
            Full walkthrough also on{' '}
            <Link href="/guide" className="text-violet-700 hover:underline">
              /guide
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
