import Link from 'next/link';
import { getMedicalAnalytics } from '@/lib/analytics';

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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">أدوات تحليل البيانات الطبية</h1>
            <p className="text-sm text-slate-600">
              مؤشرات · توزيع EVA · أعلى الأدوية · موظفون · سلسلة زمنية
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/reports" className="text-blue-600 hover:underline">
              التقارير
            </Link>
            <Link href="/eva-split" className="text-blue-600 hover:underline">
              تقسيم EVA
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <form className="flex flex-wrap gap-2 items-end text-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">الشهر</label>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded border px-2 py-1.5"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1.5 text-white"
          >
            تحديث
          </button>
          <a
            href={`/api/analytics?period=${period}&format=csv`}
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
          >
            تصدير CSV
          </a>
        </form>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {k && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Kpi label="برامج نشطة" value={fmt(k.active_programs)} />
              <Kpi label="مرضى" value={fmt(k.unique_patients)} />
              <Kpi label="موظفون" value={fmt(k.unique_employees)} />
              <Kpi label="بنود دوائية" value={fmt(k.active_med_lines)} />
              <Kpi
                label="نسبة EVA"
                value={`${k.eva_pct}%`}
                sub={`${fmt(k.eva_lines)} / ${fmt(k.eva_lines + k.not_eva_lines)}`}
              />
              <Kpi label="برامج بمستندات" value={fmt(k.programs_with_docs)} />
              <Kpi label={`دورات ${period}`} value={fmt(k.refill_cycles_period)} />
              <Kpi label="مصروف" value={fmt(k.dispensed_period)} />
              <Kpi label="قيد المراجعة" value={fmt(k.in_review_period)} />
              <Kpi
                label="تكلفة تقديرية"
                value={`${fmt(Math.round(k.est_cost_period_egp))} EGP`}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                  توزيع Formulary
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

              <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                  صلة القرابة
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

            <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                أعلى 25 دواء (تكرار في البرامج)
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="p-2">الدواء</th>
                    <th className="p-2">بنود</th>
                    <th className="p-2">برامج</th>
                    <th className="p-2">كمية شهرية</th>
                    <th className="p-2">منها EVA</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_drugs.map((d) => (
                    <tr key={d.drug_name} className="border-t">
                      <td className="p-2 font-medium">{d.drug_name}</td>
                      <td className="p-2">{d.line_count}</td>
                      <td className="p-2">{d.program_count}</td>
                      <td className="p-2">{d.total_qty}</td>
                      <td className="p-2 text-emerald-700">{d.eva_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                أعلى موظفين بعدد الأدوية
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="p-2">الموظف</th>
                    <th className="p-2">ID</th>
                    <th className="p-2">برامج</th>
                    <th className="p-2">أدوية</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_employees_by_meds.map((e) => (
                    <tr key={e.employee_id} className="border-t">
                      <td className="p-2">{e.employee_name}</td>
                      <td className="p-2 font-mono text-xs">{e.employee_id}</td>
                      <td className="p-2">{e.program_count}</td>
                      <td className="p-2 font-medium">{e.med_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                الصرف الشهري (آخر 12)
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="p-2">الشهر</th>
                    <th className="p-2">دورات</th>
                    <th className="p-2">مصروف</th>
                    <th className="p-2">تقديري EGP</th>
                    <th className="p-2">معتمد EGP</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.monthly_refills.map((m) => (
                    <tr key={m.period} className="border-t">
                      <td className="p-2 font-mono">{m.period}</td>
                      <td className="p-2">{m.cycles}</td>
                      <td className="p-2">{m.dispensed}</td>
                      <td className="p-2">{fmt(Math.round(m.est_egp))}</td>
                      <td className="p-2">{fmt(Math.round(m.approved_egp))}</td>
                    </tr>
                  ))}
                  {data!.monthly_refills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        لا دورات صرف بعد — ولّد الشهر الحالي
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
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
