import Link from 'next/link';
import { listRefills } from '@/lib/refills';
import { GenerateMonthButton } from './GenerateMonthButton';

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
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Monthly refill review</h1>
            <p className="text-sm text-slate-600">Refill cycles · Neon · safety gate on approve</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/refills/safety"
              className="rounded bg-red-700 px-3 py-1.5 text-white hover:bg-red-800"
            >
              Safety queue
            </Link>
            <Link href="/programs" className="text-blue-600 hover:underline">
              Programs
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              ← Home
            </Link>
          </div>
        </header>

        <GenerateMonthButton />

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
            <p className="mt-1 text-slate-600">
              Ensure <code>DATABASE_URL</code> is set on Vercel.
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <p className="text-slate-500 text-sm">
            No matching cycles. Use Generate month cycle.
          </p>
        )}

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
      </div>
    </main>
  );
}
