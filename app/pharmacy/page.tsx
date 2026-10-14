import Link from 'next/link';
import { buildPharmacyPickList } from '@/lib/pharmacy';
import { scanRefillSafetyQueue } from '@/lib/refillSafety';
import { PharmacyBatchButton } from './PharmacyBatchButton';
import { PharmacyCsvImport } from './PharmacyCsvImport';
import { PharmacySearchList } from './PharmacySearchList';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildHref(
  period: string,
  opts: { formulary?: string; status?: string }
) {
  const p = new URLSearchParams({ period });
  if (opts.formulary && opts.formulary !== 'all') {
    p.set('formulary', opts.formulary);
  }
  if (opts.status) p.set('status', opts.status);
  return `/pharmacy?${p.toString()}`;
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: { period?: string; status?: string; formulary?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const status = searchParams.status || undefined;
  const formularyRaw = (searchParams.formulary || 'all').toUpperCase();
  const formulary =
    formularyRaw === 'EVA' || formularyRaw === 'NOT_EVA'
      ? (formularyRaw as 'EVA' | 'NOT_EVA')
      : 'all';

  let lines: Awaited<ReturnType<typeof buildPharmacyPickList>> = [];
  let safetyFlagged = 0;
  let error: string | null = null;

  try {
    lines = await buildPharmacyPickList({
      period,
      status,
      includePending: !status,
      formulary,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  try {
    const q = await scanRefillSafetyQueue({
      limit: 40,
      statuses: ['in_review', 'approved', 'partially_approved'],
    });
    safetyFlagged = q.flagged;
  } catch {
    safetyFlagged = 0;
  }

  const cycleCount = new Set(lines.map((l) => l.cycle_id)).size;
  const evaCount = lines.filter((l) => l.company_preferred).length;
  const notEvaCount = lines.length - evaCount;

  const csvBase = `/api/pharmacy/pick-list?period=${encodeURIComponent(period)}&format=csv&includePending=true`;

  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={3} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="aid-section-label">Step 3 of 5 · Pharmacy</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pharmacy
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                الصيدلية · إيفا / غير إيفا · تصدير واستيراد CSV
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/claims"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                ← Claims
              </Link>
              <Link href="/programs" className="aid-cta-violet px-3 py-2 text-sm">
                Next: Programs →
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="aid-kpi">
            <p className="text-xl font-bold text-slate-900">{lines.length}</p>
            <p className="text-[11px] text-slate-500">lines</p>
          </div>
          <div className="aid-kpi">
            <p className="text-xl font-bold text-teal-800">{evaCount}</p>
            <p className="text-[11px] text-slate-500">EVA</p>
          </div>
          <div className="aid-kpi">
            <p className="text-xl font-bold text-slate-800">{notEvaCount}</p>
            <p className="text-[11px] text-slate-500">Not EVA</p>
          </div>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur"
        >
          <label className="text-sm font-medium text-slate-700">Period</label>
          <input
            type="month"
            name="period"
            defaultValue={period}
            className="rounded-xl border border-slate-200 px-3 py-2 text-base"
          />
          {formulary !== 'all' && (
            <input type="hidden" name="formulary" value={formulary} />
          )}
          {status && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go
          </button>
          <span className="text-xs text-slate-500 ml-auto">
            {cycleCount} patient{cycleCount === 1 ? '' : 's'} · {period}
          </span>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={buildHref(period, { formulary: 'EVA', status })}
            className={`rounded-2xl border-2 p-5 shadow-sm transition active:scale-[0.99] ${
              formulary === 'EVA'
                ? 'border-teal-600 bg-teal-50/95 ring-2 ring-teal-200'
                : 'border-white/80 bg-white/90 hover:border-teal-300 backdrop-blur'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Route 1 · إيفا
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">Available at EVA</p>
            <p className="text-sm text-slate-600" dir="rtl">
              متوفر في إيفا
            </p>
            <p className="mt-3 text-2xl font-bold text-teal-800">
              {formulary === 'all' || formulary === 'EVA' ? evaCount : '—'}
              <span className="text-sm font-medium text-slate-500 ml-1">lines</span>
            </p>
            {formulary === 'EVA' && (
              <p className="mt-2 text-[11px] font-medium text-teal-800">Selected filter ✓</p>
            )}
          </Link>
          <Link
            href={buildHref(period, { formulary: 'NOT_EVA', status })}
            className={`rounded-2xl border-2 p-5 shadow-sm transition active:scale-[0.99] ${
              formulary === 'NOT_EVA'
                ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-300'
                : 'border-white/80 bg-white/90 hover:border-slate-400 backdrop-blur'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Route 2 · خارج إيفا
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">Not at EVA</p>
            <p className="text-sm text-slate-600" dir="rtl">
              غير متوفر في إيفا
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {formulary === 'all' || formulary === 'NOT_EVA' ? notEvaCount : '—'}
              <span className="text-sm font-medium text-slate-500 ml-1">lines</span>
            </p>
            {formulary === 'NOT_EVA' && (
              <p className="mt-2 text-[11px] font-medium text-slate-700">Selected filter ✓</p>
            )}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref(period, { formulary: 'all', status })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              formulary === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white/90 border border-white/80 text-slate-600 backdrop-blur'
            }`}
          >
            Show all routes
          </Link>
        </div>

        <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/90 p-5 space-y-3 backdrop-blur">
          <p className="text-sm font-semibold text-teal-950">
            Download for pharmacy · تحميل للصيدلية
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href={`${csvBase}&formulary=EVA`}
              className="aid-cta-teal py-3.5 text-center text-sm"
            >
              CSV · EVA
            </a>
            <a
              href={`${csvBase}&formulary=NOT_EVA`}
              className="rounded-xl bg-slate-700 py-3.5 text-center text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
            >
              CSV · Not EVA
            </a>
            <a
              href={`${csvBase}&formulary=${formulary === 'all' ? 'all' : formulary}`}
              className="rounded-xl border border-teal-400 bg-white/90 py-3.5 text-center text-sm font-semibold text-teal-900 hover:bg-teal-50"
            >
              CSV · current filter
            </a>
            <a
              href="/templates/pharmacy-import-template.csv"
              download="pharmacy-import-template.csv"
              className="rounded-xl border-2 border-indigo-400 bg-indigo-50/90 py-3.5 text-center text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
            >
              CSV template · قالب
            </a>
          </div>
          <p className="text-xs text-teal-900/80 leading-relaxed">
            1) Export EVA / Not EVA · 2) Fill dispensed qty · 3) Import below · 4) Batch
            dispense when ready
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PharmacyBatchButton period={period} />
            <Link
              href="/eva-split"
              className="text-sm text-teal-800 font-medium hover:underline"
            >
              EVA split screen
            </Link>
          </div>
        </div>

        <PharmacyCsvImport />

        {safetyFlagged > 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50/95 p-4 text-sm text-red-900 space-y-2">
            <p className="font-semibold">
              {safetyFlagged} safety flag{safetyFlagged === 1 ? '' : 's'}
            </p>
            <p className="text-xs">
              Review before bulk dispense (DDInter / allergy).
            </p>
            <Link
              href="/refills/safety"
              className="inline-block rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Open safety queue
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['', 'All statuses'],
              ['in_review', 'In review'],
              ['approved', 'Approved'],
              ['dispensed', 'Dispensed'],
            ] as const
          ).map(([s, label]) => (
            <Link
              key={s || 'all'}
              href={buildHref(period, {
                formulary,
                status: s || undefined,
              })}
              className={`min-h-[2.5rem] rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                (status || '') === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/90 border-slate-200 text-slate-600 backdrop-blur'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {error}
          </div>
        )}

        {!error && <PharmacySearchList lines={lines} emptyHint />}
      </div>

      <div className="aid-sticky-bar">
        <div className="mx-auto max-w-5xl flex gap-2">
          <Link
            href="/claims"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Claims
          </Link>
          <Link href="/programs" className="aid-cta-violet flex-1 py-3 text-center text-sm">
            Programs →
          </Link>
        </div>
      </div>
    </main>
  );
}
