import Link from 'next/link';
import { getPmsDashboard } from '@/lib/pspOps';
import { JOURNEY_LABELS_AR } from '@/lib/psp';
import { BatchReleaseButton } from './BatchReleaseButton';

export const dynamic = 'force-dynamic';

export default async function PmsPage() {
  let data: Awaited<ReturnType<typeof getPmsDashboard>> | null = null;
  let error: string | null = null;

  try {
    data = await getPmsDashboard();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">PMS · Patient Support Ops</h1>
            <p className="text-sm text-slate-600">
              Axios-aligned open model — journey · OTA · adherence · adverse events
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/psp" className="text-blue-600 hover:underline">
              Journey
            </Link>
            <Link href="/care-line" className="text-blue-600 hover:underline">
              Care Line
            </Link>
            <Link href="/notifications" className="text-blue-600 hover:underline">
              WhatsApp
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Active programs</div>
                <div className="text-3xl font-bold">{data.active_programs}</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Due refills {data.period}</div>
                <div className="text-3xl font-bold text-amber-700">
                  {data.due_refills_period}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Adherence reviews ≤7d</div>
                <div className="text-3xl font-bold text-indigo-700">
                  {data.adherence_reviews_due_7d}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Open adverse events</div>
                <div className="text-3xl font-bold text-red-700">
                  {data.open_adverse_events}
                </div>
              </div>
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <h2 className="font-medium text-sm">Batch pharmacy release letters</h2>
              <p className="text-xs text-slate-500">
                For active programs still due this period (not dispensed).
              </p>
              <BatchReleaseButton period={data.period} />
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <h2 className="font-medium text-sm">On-Time Access (OTA)</h2>
              <p className="text-xs text-slate-500">
                Days from enrolment to first dispense — shorter gap is the goal.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">With first dispense</div>
                  <div className="text-xl font-semibold">
                    {data.ota.programs_with_first_dispense}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Avg days</div>
                  <div className="text-xl font-semibold">
                    {data.ota.avg_days_to_first_dispense ?? '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Median days</div>
                  <div className="text-xl font-semibold">
                    {data.ota.median_days_to_first_dispense ?? '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xs text-slate-500">Within ≤7 days</div>
                  <div className="text-xl font-semibold text-emerald-800">
                    {data.ota.first_dispense_within_7_days}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium text-sm mb-3">Journey stages</h2>
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.by_stage).map(([s, n]) => (
                    <li key={s} className="flex justify-between">
                      <Link href={`/psp?stage=${s}`} className="text-blue-600 hover:underline">
                        {JOURNEY_LABELS_AR[s] || s}
                      </Link>
                      <span className="font-medium">{n}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium text-sm mb-3">Latest PNAT risk mix</h2>
                {Object.keys(data.by_risk).length === 0 ? (
                  <p className="text-sm text-slate-500">No assessments yet</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {Object.entries(data.by_risk).map(([r, n]) => (
                      <li key={r} className="flex justify-between">
                        <span>{r}</span>
                        <span className="font-medium">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm text-sm space-y-2">
              <h2 className="font-medium">Monthly flow</h2>
              <ol className="list-decimal list-inside text-slate-600 space-y-1 text-xs">
                <li>Generate refills → Care Line due list</li>
                <li>WhatsApp reminders → release letters</li>
                <li>Pharmacy EVA / NOT EVA pick lists</li>
                <li>PNAT / PFET on high-touch patients</li>
                <li>Adverse events · dropout codes · PMS review</li>
              </ol>
              <p className="text-xs text-slate-400">SOP: docs/psp-ops-sop.md</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
