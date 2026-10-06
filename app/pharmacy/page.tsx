import Link from 'next/link';
import { buildPharmacyPickList } from '@/lib/pharmacy';
import { scanRefillSafetyQueue } from '@/lib/refillSafety';
import { PharmacyBatchButton } from './PharmacyBatchButton';
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

  const groups = new Map<string, typeof lines>();
  for (const line of lines) {
    const key = line.cycle_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }

  const evaCount = lines.filter((l) => l.company_preferred).length;
  const notEvaCount = lines.length - evaCount;

  const csvBase = `/api/pharmacy/pick-list?period=${encodeURIComponent(period)}&format=csv&includePending=true`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={3} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 3 of 5
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pharmacy
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                الصيدلية · إيفا / غير إيفا · تصدير CSV
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/claims"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                ← Claims
              </Link>
              <Link
                href="/programs"
                className="rounded-xl bg-violet-700 px-3 py-2 font-semibold text-white hover:bg-violet-800"
              >
                Next: Programs →
              </Link>
            </div>
          </div>
        </header>

        {/* Period */}
        <form
          method="get"
          className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm"
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
            {lines.length} lines · {groups.size} patients
          </span>
        </form>

        {/* Big EVA / NOT EVA route cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={buildHref(period, { formulary: 'EVA', status })}
            className={`rounded-2xl border-2 p-5 shadow-sm transition ${
              formulary === 'EVA'
                ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-200'
                : 'border-slate-200 bg-white hover:border-teal-300'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Route 1
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">Available at EVA</p>
            <p className="text-sm text-slate-600" dir="rtl">
              متوفر في إيفا
            </p>
            <p className="mt-3 text-2xl font-bold text-teal-800">
              {formulary === 'all' || formulary === 'EVA' ? evaCount : '—'}
              <span className="text-sm font-medium text-slate-500 ml-1">lines</span>
            </p>
          </Link>
          <Link
            href={buildHref(period, { formulary: 'NOT_EVA', status })}
            className={`rounded-2xl border-2 p-5 shadow-sm transition ${
              formulary === 'NOT_EVA'
                ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-300'
                : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Route 2
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">Not at EVA</p>
            <p className="text-sm text-slate-600" dir="rtl">
              غير متوفر في إيفا
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {formulary === 'all' || formulary === 'NOT_EVA' ? notEvaCount : '—'}
              <span className="text-sm font-medium text-slate-500 ml-1">lines</span>
            </p>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref(period, { formulary: 'all', status })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              formulary === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border text-slate-600'
            }`}
          >
            Show all
          </Link>
        </div>

        {/* Exports */}
        <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/80 p-5 space-y-3">
          <p className="text-sm font-semibold text-teal-950">
            Download for pharmacy · تحميل للصيدلية
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <a
              href={`${csvBase}&formulary=EVA`}
              className="rounded-xl bg-teal-600 py-3 text-center text-sm font-semibold text-white hover:bg-teal-700 shadow-sm"
            >
              CSV · EVA
            </a>
            <a
              href={`${csvBase}&formulary=NOT_EVA`}
              className="rounded-xl bg-slate-700 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
            >
              CSV · Not EVA
            </a>
            <a
              href={`${csvBase}&formulary=${formulary === 'all' ? 'all' : formulary}`}
              className="rounded-xl border border-teal-400 bg-white py-3 text-center text-sm font-semibold text-teal-900 hover:bg-teal-50"
            >
              CSV · current filter
            </a>
          </div>
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

        {safetyFlagged > 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900 space-y-2">
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

        {/* Status filters */}
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
              className={`min-h-[2.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                (status || '') === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200 text-slate-600'
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

        {!error && groups.size === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500 space-y-2">
            <p>No lines for this period / filter.</p>
            <p className="text-xs">
              Process the{' '}
              <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                queue
              </Link>{' '}
              and generate{' '}
              <Link href="/refills" className="text-violet-700 font-medium underline">
                refills
              </Link>{' '}
              first.
            </p>
          </div>
        )}

        {Array.from(groups.entries()).map(([cycleId, group]) => {
          const head = group[0];
          const evaLines = group.filter((l) => l.company_preferred).length;
          return (
            <article
              key={cycleId}
              className="rounded-2xl border bg-white shadow-sm overflow-hidden"
            >
              <div className="bg-slate-50 px-4 py-3 flex flex-wrap justify-between gap-2 border-b">
                <div>
                  <p className="font-semibold text-slate-900">
                    {head.patient_name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {head.employee_name}
                    {head.program_code ? ` · ${head.program_code}` : ''}
                    {head.relation ? ` · ${head.relation}` : ''}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="inline-block rounded-full bg-white border px-2 py-0.5 text-[11px] font-semibold">
                    {head.cycle_status}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {evaLines}/{group.length} EVA
                  </p>
                  <Link
                    href={`/refills/${cycleId}`}
                    className="block text-xs font-medium text-violet-700 hover:underline"
                  >
                    Cycle detail
                  </Link>
                </div>
              </div>

              {/* Mobile line list */}
              <ul className="md:hidden divide-y">
                {group.map((l) => (
                  <li
                    key={`${l.cycle_id}-${l.line_code}`}
                    className="px-4 py-3 flex justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{l.drug_name}</p>
                      <p className="text-[11px] text-slate-500">
                        Qty {l.dispensed_qty ?? l.approved_qty ?? l.qty}
                        {' · '}
                        {l.item_status}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full h-fit ${
                        l.company_preferred
                          ? 'bg-teal-100 text-teal-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {l.company_preferred ? 'EVA' : 'NOT EVA'}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead className="text-xs text-slate-500 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Drug</th>
                    <th className="p-3 font-semibold">Qty</th>
                    <th className="p-3 font-semibold">Route</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((l) => (
                    <tr
                      key={`${l.cycle_id}-${l.line_code}`}
                      className="border-t hover:bg-slate-50/80"
                    >
                      <td className="p-3 font-medium">{l.drug_name}</td>
                      <td className="p-3">
                        {l.dispensed_qty ?? l.approved_qty ?? l.qty}
                      </td>
                      <td className="p-3">
                        {l.company_preferred ? (
                          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                            EVA
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            NOT EVA
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-600">{l.item_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          );
        })}
      </div>
    </main>
  );
}
