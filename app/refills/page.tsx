import Link from 'next/link';
import { listRefills } from '@/lib/refills';
import { GenerateMonthButton } from './GenerateMonthButton';
import { FlowSteps } from '../FlowSteps';
import { FormSelectPicker } from '@/components/FormSelectPicker';
import { REFILL_STATUS_OPTIONS } from '@/lib/optionLists';

export const dynamic = 'force-dynamic';

function statusStyle(s: string) {
  if (s === 'in_review') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (s === 'approved' || s === 'partially_approved')
    return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
  if (s === 'dispensed') return 'bg-teal-100 text-teal-900 ring-1 ring-teal-200';
  if (s === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'in_review', label: 'In review' },
  { id: 'approved', label: 'Approved' },
  { id: 'partially_approved', label: 'Partial' },
  { id: 'dispensed', label: 'Dispensed' },
  { id: 'rejected', label: 'Rejected' },
];

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function RefillsPage({
  searchParams,
}: {
  searchParams: { status?: string; period?: string };
}) {
  let rows: Awaited<ReturnType<typeof listRefills>> = [];
  let error: string | null = null;
  const status = searchParams.status || '';
  const period = searchParams.period || '';

  try {
    rows = await listRefills({
      status: status || undefined,
      period: period || undefined,
      limit: 100,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load refills';
  }

  const inReview = rows.filter((r) => r.status === 'in_review').length;
  const dispensed = rows.filter((r) => r.status === 'dispensed').length;
  const approved = rows.filter(
    (r) => r.status === 'approved' || r.status === 'partially_approved'
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 5 of 5 · Refills
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Refills
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                الدورات الشهرية · توليد ومراجعة
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/programs"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                ← Programs
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-xl bg-teal-600 px-3 py-2 font-semibold text-white hover:bg-teal-700"
              >
                Pharmacy CSV
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border bg-white px-2 py-3 shadow-sm">
            <p className="text-xl font-bold text-amber-800">{inReview}</p>
            <p className="text-[11px] text-slate-500">in review</p>
          </div>
          <div className="rounded-xl border bg-white px-2 py-3 shadow-sm">
            <p className="text-xl font-bold text-emerald-800">{approved}</p>
            <p className="text-[11px] text-slate-500">approved</p>
          </div>
          <div className="rounded-xl border bg-white px-2 py-3 shadow-sm">
            <p className="text-xl font-bold text-teal-800">{dispensed}</p>
            <p className="text-[11px] text-slate-500">dispensed</p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-950">
                Generate this month’s cycles
              </p>
              <p className="text-xs text-violet-800 mt-0.5">
                Active programs → refill cycles → review → Pharmacy
              </p>
            </div>
            {inReview > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                {inReview} in review
              </span>
            ) : (
              rows.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                  Review clear ✓
                </span>
              )
            )}
          </div>
          <GenerateMonthButton />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/refills/safety"
              className="font-medium text-red-700 hover:underline"
            >
              Safety queue
            </Link>
            <Link
              href="/pharmacy"
              className="font-medium text-teal-800 hover:underline"
            >
              Export pharmacy lists
            </Link>
          </div>
        </div>

        <form
          method="get"
          className="rounded-2xl border bg-white p-3 shadow-sm flex flex-wrap gap-2 items-center"
        >
          <label className="text-sm font-medium text-slate-700">Period</label>
          <input
            type="month"
            name="period"
            defaultValue={period || defaultPeriod()}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-base"
          />
          <FormSelectPicker
            name="status"
            defaultValue={status}
            options={REFILL_STATUS_OPTIONS}
            allowCreate={false}
            placeholder="Status…"
            className="min-w-[180px]"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((s) => (
            <Link
              key={s.id || 'all'}
              href={
                s.id
                  ? `/refills?status=${s.id}${period ? `&period=${encodeURIComponent(period)}` : ''}`
                  : period
                    ? `/refills?period=${encodeURIComponent(period)}`
                    : '/refills'
              }
              className={`min-h-[2.5rem] rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                status === s.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <strong>Load failed:</strong> {error}
            <p className="mt-1 text-xs text-slate-600">
              Unlock on{' '}
              <Link href="/admin" className="underline text-violet-700">
                Admin
              </Link>{' '}
              if needed.
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500 space-y-2">
            <p className="font-medium text-slate-700">No cycles for this filter</p>
            <p className="text-xs">
              Use <strong>Generate</strong> above, or enroll from the{' '}
              <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                queue
              </Link>
              .
            </p>
          </div>
        )}

        <div className="space-y-3 md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/refills/${r.id}`}
              className="block rounded-2xl border bg-white p-4 shadow-sm space-y-2 hover:border-violet-300 active:bg-slate-50"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.patient_name || '—'}</p>
                  <p className="text-xs text-slate-500">
                    {r.employee_name}
                    {r.external_employee_id ? ` · ${r.external_employee_id}` : ''}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full h-fit shrink-0 ${statusStyle(
                    String(r.status)
                  )}`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">{r.program_code}</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{r.period}</span>
                <span className="font-medium">
                  {r.estimated_total_egp != null
                    ? `~${r.estimated_total_egp} EGP`
                    : `${r.item_count ?? 0} items`}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Program</th>
                  <th className="p-3 font-semibold">Patient</th>
                  <th className="p-3 font-semibold">Period</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Items</th>
                  <th className="p-3 font-semibold">Est.</th>
                  <th className="p-3 font-semibold">Approved</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-xs">{r.program_code}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.patient_name}</div>
                      <div className="text-xs text-slate-500">
                        {r.employee_name} · {r.external_employee_id}
                      </div>
                    </td>
                    <td className="p-3">{r.period}</td>
                    <td className="p-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                          String(r.status)
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">{r.item_count}</td>
                    <td className="p-3">{r.estimated_total_egp ?? '—'}</td>
                    <td className="p-3">{r.approved_total_egp ?? '—'}</td>
                    <td className="p-3">
                      <Link
                        href={`/refills/${r.id}`}
                        className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && rows.length > 0 && inReview === 0 && (
          <p className="text-center text-sm text-slate-500">
            Month review clear ·{' '}
            <Link href="/pharmacy" className="text-teal-700 font-medium hover:underline">
              export pharmacy lists
            </Link>
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-5xl flex gap-2">
          <Link
            href="/programs"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Programs
          </Link>
          <Link
            href="/pharmacy"
            className="flex-1 rounded-xl bg-teal-600 py-3 text-center text-sm font-semibold text-white"
          >
            Pharmacy →
          </Link>
        </div>
      </div>
    </main>
  );
}
