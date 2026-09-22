import Link from 'next/link';
import { getCombinationReport } from '@/lib/medCombinations';

export const dynamic = 'force-dynamic';

export default async function CombinationsPage() {
  let report: Awaited<ReturnType<typeof getCombinationReport>> | null = null;
  let error: string | null = null;

  try {
    report = await getCombinationReport({ pairLimit: 40, multiLimit: 40 });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  const maxPair = report?.pairs[0]?.program_count || 1;
  const maxSize =
    report?.regimen_sizes.reduce((m, r) => Math.max(m, r.program_count), 1) || 1;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Medicine combinations</h1>
            <p className="text-sm text-slate-600">
              Co-prescription patterns across active chronic programs — ops
              observation, not clinical DDI software.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/analytics" className="text-blue-600 hover:underline">
              Analytics
            </Link>
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              Pharmacy
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

        {report && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Active programs</div>
                <div className="text-3xl font-bold">{report.active_programs}</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">With 2+ meds</div>
                <div className="text-3xl font-bold text-indigo-700">
                  {report.programs_with_2plus}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Tracked pair patterns</div>
                <div className="text-3xl font-bold">{report.pairs.length}</div>
              </div>
            </div>

            {report.pattern_flags.length > 0 && (
              <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
                <h2 className="font-medium text-sm">Pattern signals</h2>
                <p className="text-xs text-slate-500">
                  Name-based flags for review queues (e.g. ACE+ARB, polypharmacy).
                  Confirm clinically before action.
                </p>
                <ul className="space-y-2 text-sm">
                  {report.pattern_flags.map((f) => (
                    <li
                      key={f.flag}
                      className="flex justify-between gap-3 border-b border-slate-100 pb-2"
                    >
                      <span>{f.label}</span>
                      <span className="font-semibold text-amber-800">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <h2 className="font-medium text-sm">Regimen size distribution</h2>
              <div className="space-y-1.5">
                {report.regimen_sizes.map((r) => (
                  <div key={r.med_count} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-xs text-slate-500">
                      {r.med_count} med{r.med_count === 1 ? '' : 's'}
                    </span>
                    <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-indigo-400/80 rounded"
                        style={{
                          width: `${Math.max(4, (r.program_count / maxSize) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium">
                      {r.program_count}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                Most common co-prescribed pairs
              </h2>
              {report.pairs.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No pairs yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="p-2">Drug A</th>
                      <th className="p-2">Drug B</th>
                      <th className="p-2">Programs</th>
                      <th className="p-2">%</th>
                      <th className="p-2 w-1/4"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pairs.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{p.drug_a}</td>
                        <td className="p-2">{p.drug_b}</td>
                        <td className="p-2 font-medium">{p.program_count}</td>
                        <td className="p-2 text-xs text-slate-500">
                          {p.pct_of_programs}%
                        </td>
                        <td className="p-2">
                          <div className="h-2 bg-slate-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-500/70"
                              style={{
                                width: `${(p.program_count / maxPair) * 100}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                Multi-drug programs (sample)
              </h2>
              <div className="divide-y text-sm">
                {report.multi_drug_programs.map((p) => (
                  <div key={p.program_id} className="p-3 space-y-1">
                    <div className="flex flex-wrap justify-between gap-2">
                      <Link
                        href={`/programs/${p.program_id}`}
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        {p.program_code}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {p.med_count} meds
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {p.patient_name}
                      <span className="text-slate-400"> · {p.employee_name}</span>
                    </div>
                    <div className="text-xs">{p.meds.join(' · ')}</div>
                    {p.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.flags.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="text-xs text-slate-400">
          API: GET /api/combinations · Flags are heuristic name matches for ops
          triage only.
        </p>
      </div>
    </main>
  );
}
