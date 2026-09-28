import Link from 'next/link';
import { listRefills } from '@/lib/refills';
import { GenerateMonthButton } from './GenerateMonthButton';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

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

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current="refills" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-violet-600 font-medium">Ops · Monthly refills</p>
              <h1 className="text-2xl font-semibold">Monthly refill review</h1>
              <p className="text-sm text-slate-600">
                Generate cycles → review → Pharmacy pick list
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/refills/safety"
                className="rounded bg-red-700 px-3 py-1.5 text-white hover:bg-red-800"
              >
                Safety queue
              </Link>
              <Link
                href="/programs"
                className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                ← Programs
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-lg bg-teal-600 text-white px-3 py-1.5 hover:bg-teal-700"
              >
                Pharmacy →
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-4 text-sm text-violet-900 space-y-2">
          <p>
            <strong>What to do:</strong> Generate month cycle → open each cycle →
            approve (safety gate if flagged) → use Pharmacy for dispense.
          </p>
          <GenerateMonthButton />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {['in_review', 'approved', 'partially_approved', 'dispensed', 'rejected'].map(
            (s) => (
              <Link
                key={s}
                href={`/refills?status=${s}`}
                className={`rounded-full px-3 py-1 border ${
                  searchParams.status === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                {s}
              </Link>
            )
          )}
          <Link
            href="/refills"
            className="rounded-full px-3 py-1 border bg-white border-slate-200"
          >
            All
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <strong>Load failed:</strong> {error}
            <p className="mt-1 text-slate-600 text-xs">
              Ensure <code>DATABASE_URL</code> is set. Unlock on Home if needed.
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 space-y-2">
            <p>No matching cycles.</p>
            <p className="text-xs">
              Use <strong>Generate month cycle</strong> above, or enroll programs from{' '}
              <Link href="/intake-ops" className="text-blue-600 underline">
                intake queue
              </Link>
              .
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Program</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Est.</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{r.program_code}</td>
                    <td className="p-3">
                      <div>{r.patient_name}</div>
                      <div className="text-xs text-slate-500">
                        {r.employee_name} · {r.external_employee_id}
                      </div>
                    </td>
                    <td className="p-3">{r.period}</td>
                    <td className="p-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">{r.item_count}</td>
                    <td className="p-3">{r.estimated_total_egp ?? '—'}</td>
                    <td className="p-3">{r.approved_total_egp ?? '—'}</td>
                    <td className="p-3">
                      <Link
                        href={`/refills/${r.id}`}
                        className="text-blue-600 hover:underline"
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
