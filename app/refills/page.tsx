import Link from 'next/link';
import { listRefills } from '@/lib/refills';
import { GenerateMonthButton } from './GenerateMonthButton';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

function statusStyle(s: string) {
  if (s === 'in_review') return 'bg-amber-100 text-amber-900';
  if (s === 'approved' || s === 'partially_approved')
    return 'bg-emerald-100 text-emerald-900';
  if (s === 'dispensed') return 'bg-teal-100 text-teal-900';
  if (s === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'in_review', label: 'In review' },
  { id: 'approved', label: 'Approved' },
  { id: 'partially_approved', label: 'Partial' },
  { id: 'dispensed', label: 'Dispensed' },
  { id: 'rejected', label: 'Rejected' },
];

export default async function RefillsPage({
  searchParams,
}: {
  searchParams: { status?: string; period?: string };
}) {
  let rows: Awaited<ReturnType<typeof listRefills>> = [];
  let error: string | null = null;

  try {
    rows = await listRefills({
      status: searchParams.status,
      period: searchParams.period,
      limit: 100,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load refills';
  }

  const inReview = rows.filter((r) => r.status === 'in_review').length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 5 of 5
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Refills
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                الدورات الشهرية · توليد ومراجعة
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
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

        {/* Primary action */}
        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-950">
                Generate this month’s cycles
              </p>
              <p className="text-xs text-violet-800 mt-0.5">
                Creates refill cycles for active programs → review → Pharmacy
              </p>
            </div>
            {inReview > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                {inReview} in review
              </span>
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

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((s) => (
            <Link
              key={s.id || 'all'}
              href={s.id ? `/refills?status=${s.id}` : '/refills'}
              className={`min-h-[2.25rem] rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                (searchParams.status || '') === s.id
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
            <p>No cycles for this filter.</p>
            <p className="text-xs">
              Use <strong>Generate</strong> above, or enroll from the{' '}
              <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                queue
              </Link>
              .
            </p>
          </div>
        )}

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/refills/${r.id}`}
              className="block rounded-2xl border bg-white p-4 shadow-sm space-y-2 hover:border-violet-300"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.patient_name || '—'}</p>
                  <p className="text-xs text-slate-500">
                    {r.employee_name}
                    {r.external_employee_id ? ` · ${r.external_employee_id}` : ''}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full h-fit ${statusStyle(
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

        {/* Desktop table */}
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
      </div>
    </main>
  );
}
