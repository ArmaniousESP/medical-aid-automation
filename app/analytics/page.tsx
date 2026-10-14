import Link from 'next/link';
import { getMedicalAnalytics } from '@/lib/analytics';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG');
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  let data: Awaited<ReturnType<typeof getMedicalAnalytics>> | null = null;
  let error: string | null = null;

  try {
    data = await getMedicalAnalytics(period);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل التحليل';
  }

  const k = data?.kpis;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                More tools · Analytics
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Medical analytics · تحليلات
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                مؤشرات · توزيع EVA · أعلى الأدوية · موظفون · سلسلة زمنية
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/reports"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                Reports
              </Link>
              <Link
                href="/eva-split"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                EVA split
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-xl bg-teal-600 px-3 py-2 font-semibold text-white"
              >
                Pharmacy →
              </Link>
            </div>
          </div>
        </header>

        <form className="flex flex-wrap gap-2 items-end text-sm rounded-2xl border bg-white p-3 shadow-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Month · الشهر</label>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white font-semibold"
          >
            Refresh · تحديث
          </button>
          <a
            href={`/api/analytics?period=${period}&format=csv`}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-white font-semibold hover:bg-emerald-700"
          >
            CSV export
          </a>
        </form>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {k && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Kpi label="Active programs" value={fmt(k.active_programs)} />
              <Kpi label="Patients" value={fmt(k.unique_patients)} />
              <Kpi label="Employees" value={fmt(k.unique_employees)} />
              <Kpi label="Med lines" value={fmt(k.active_med_lines)} />
              <Kpi
                label="EVA %"
                value={`${k.eva_pct}%`}
                sub={`${fmt(k.eva_lines)} / ${fmt(k.eva_lines + k.not_eva_lines)}`}
              />
              <Kpi label="With documents" value={fmt(k.programs_with_docs)} />
              <Kpi label={`Cycles ${period}`} value={fmt(k.refill_cycles_period)} />
              <Kpi label="Dispensed" value={fmt(k.dispensed_period)} />
              <Kpi label="In review" value={fmt(k.in_review_period)} />
              <Kpi
                label="Est. cost"
                value={`${fmt(Math.round(k.est_cost_period_egp))} EGP`}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                  Formulary mix
                </h2>
                <ul className="p-3 space-y-2 text-sm">
                  {data!.formulary_mix.map((f) => {
                    const total =
                      data!.formulary_mix.reduce((a, x) => a + x.n, 0) || 1;
                    const pct = Math.round((f.n / total) * 100);
                    return (
                      <li key={f.flag}>
                        <div className="flex justify-between mb-1">
                          <span>{f.flag}</span>
                          <span className="font-medium">
                            {fmt(f.n)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              f.flag.includes('Available')
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                  Relation mix
                </h2>
                <ul className="p-3 space-y-1 text-sm">
                  {data!.relation_mix.map((r) => (
                    <li key={r.relation} className="flex justify-between">
                      <span>{r.relation}</span>
                      <span className="font-medium">{fmt(r.n)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                Top 25 drugs (program frequency)
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3">Drug</th>
                    <th className="p-3">Lines</th>
                    <th className="p-3">Programs</th>
                    <th className="p-3">Monthly qty</th>
                    <th className="p-3">EVA</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_drugs.map((d) => (
                    <tr key={d.drug_name} className="border-t">
                      <td className="p-3 font-medium">{d.drug_name}</td>
                      <td className="p-3">{d.line_count}</td>
                      <td className="p-3">{d.program_count}</td>
                      <td className="p-3">{d.total_qty}</td>
                      <td className="p-3 text-emerald-700">{d.eva_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                Top employees by med count
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Programs</th>
                    <th className="p-3">Meds</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_employees_by_meds.map((e) => (
                    <tr key={e.employee_id} className="border-t">
                      <td className="p-3">{e.employee_name}</td>
                      <td className="p-3 font-mono text-xs">{e.employee_id}</td>
                      <td className="p-3">{e.program_count}</td>
                      <td className="p-3 font-medium">{e.med_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                Monthly dispense (last 12)
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Cycles</th>
                    <th className="p-3">Dispensed</th>
                    <th className="p-3">Est. EGP</th>
                    <th className="p-3">Approved EGP</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.monthly_refills.map((m) => (
                    <tr key={m.period} className="border-t">
                      <td className="p-3 font-mono">{m.period}</td>
                      <td className="p-3">{m.cycles}</td>
                      <td className="p-3">{m.dispensed}</td>
                      <td className="p-3">{fmt(Math.round(m.est_egp))}</td>
                      <td className="p-3">{fmt(Math.round(m.approved_egp))}</td>
                    </tr>
                  ))}
                  {data!.monthly_refills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        No refill cycles yet — generate the current month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        <p className="text-xs text-slate-400">API: /api/analytics?period={period}</p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-6xl flex gap-2">
          <Link
            href="/reports"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Reports
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

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
