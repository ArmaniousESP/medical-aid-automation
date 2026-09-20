import Link from 'next/link';
import { buildMedicationsReport, buildMonthlyReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string; tab?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const tab = searchParams.tab === 'meds' ? 'meds' : 'monthly';

  let monthly: Awaited<ReturnType<typeof buildMonthlyReport>> | null = null;
  let meds: Awaited<ReturnType<typeof buildMedicationsReport>> | null = null;
  let error: string | null = null;

  try {
    if (tab === 'meds') {
      meds = await buildMedicationsReport();
    } else {
      monthly = await buildMonthlyReport(period);
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  const s = monthly?.summary;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تقارير الأدوية</h1>
            <p className="text-sm text-slate-600">
              صرف شهري · قائمة المستحضرات المزمنة · CSV تلقائي
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm items-center">
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/programs" className="text-blue-600 hover:underline">
              البرامج
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/reports?period=${period}`}
            className={`rounded-full px-3 py-1 border ${
              tab === 'monthly'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            الصرف الشهري
          </Link>
          <Link
            href="/reports?tab=meds"
            className={`rounded-full px-3 py-1 border ${
              tab === 'meds'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            مستحضرات مزمنة
          </Link>
        </div>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {tab === 'monthly' && (
          <>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <form className="flex gap-2 items-center">
                <input
                  type="month"
                  name="period"
                  defaultValue={period}
                  className="rounded border px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded bg-slate-800 px-3 py-1 text-white text-sm"
                >
                  عرض
                </button>
              </form>
              <a
                href={`/api/reports/monthly?period=${period}&format=csv`}
                className="rounded bg-emerald-600 px-3 py-1 text-white text-sm hover:bg-emerald-700"
              >
                تنزيل CSV صرف
              </a>
            </div>

            {s && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card label="دورات" value={String(s.cycles)} />
                  <Card label="تقديري EGP" value={String(s.estimated_total_egp)} />
                  <Card label="معتمد EGP" value={String(s.approved_total_egp)} />
                  <Card
                    label="مصروف / معتمد / معلق"
                    value={`${s.items_dispensed} / ${s.items_approved} / ${s.items_pending}`}
                  />
                </div>

                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <h2 className="font-medium mb-2">حالات الدورات</h2>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {Object.entries(s.by_status).map(([k, v]) => (
                      <span key={k} className="rounded bg-slate-100 px-2 py-1">
                        {k}: {v}
                      </span>
                    ))}
                    {Object.keys(s.by_status).length === 0 && (
                      <span className="text-slate-500">لا بيانات لهذا الشهر</span>
                    )}
                  </div>
                </div>

                {monthly && monthly.top_meds.length > 0 && (
                  <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left">أكثر الأدوية هذا الشهر</th>
                          <th className="p-2 text-left">سطور</th>
                          <th className="p-2 text-left">كمية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.top_meds.map((m) => (
                          <tr key={m.drug_name} className="border-t">
                            <td className="p-2">{m.drug_name}</td>
                            <td className="p-2">{m.lines}</td>
                            <td className="p-2">{m.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {monthly && monthly.cycles.length > 0 && (
                  <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left">Program</th>
                          <th className="p-2 text-left">Patient</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Est.</th>
                          <th className="p-2 text-left">Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.cycles.map((c: any) => (
                          <tr key={c.id} className="border-t">
                            <td className="p-2 font-mono text-xs">
                              <Link
                                href={`/refills/${c.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {c.program_code}
                              </Link>
                            </td>
                            <td className="p-2">{c.patient_name}</td>
                            <td className="p-2 text-xs">{c.status}</td>
                            <td className="p-2">{c.estimated_total_egp ?? '—'}</td>
                            <td className="p-2">{c.approved_total_egp ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'meds' && meds && (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/reports/medications?format=csv"
                className="rounded bg-emerald-600 px-3 py-1 text-white text-sm hover:bg-emerald-700"
              >
                تنزيل CSV مستحضرات
              </a>
              <span className="text-xs text-slate-500 self-center">
                generated {meds.generated_at.slice(0, 19).replace('T', ' ')} UTC
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card label="برامج نشطة" value={String(meds.summary.active_programs)} />
              <Card label="بنود أدوية" value={String(meds.summary.active_med_lines)} />
              <Card label="مستحضرات فريدة" value={String(meds.summary.unique_drugs)} />
              <Card label="EVA" value={String(meds.summary.eva_preferred)} />
              <Card label="خارج EVA" value={String(meds.summary.not_in_eva)} />
            </div>

            {meds.by_formulary.length > 0 && (
              <div className="rounded-lg border bg-white p-4 shadow-sm text-sm">
                <h2 className="font-medium mb-2">حسب الـ formulary</h2>
                <div className="flex flex-wrap gap-2">
                  {meds.by_formulary.map((f) => (
                    <span key={f.formulary_flag} className="rounded bg-slate-100 px-2 py-1">
                      {f.formulary_flag}: {f.lines} بند · {f.programs} برنامج
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">المستحضر</th>
                    <th className="p-2 text-left">برامج</th>
                    <th className="p-2 text-left">كمية/دورة</th>
                    <th className="p-2 text-left">Formulary</th>
                    <th className="p-2 text-left">EVA</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.catalog.map((m) => (
                    <tr key={m.drug_name} className="border-t">
                      <td className="p-2">{m.drug_name}</td>
                      <td className="p-2">{m.programs}</td>
                      <td className="p-2">{m.total_qty_per_cycle}</td>
                      <td className="p-2 text-xs">{m.formulary_flag}</td>
                      <td className="p-2">{m.company_preferred ? 'نعم' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
              <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
                تفصيل حسب البرنامج
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Program</th>
                    <th className="p-2 text-left">Patient</th>
                    <th className="p-2 text-left">Line</th>
                    <th className="p-2 text-left">Requested → Matched</th>
                    <th className="p-2 text-left">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.program_lines.map((r, i) => (
                    <tr key={`${r.program_code}-${r.line_code}-${i}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{r.program_code}</td>
                      <td className="p-2">{r.patient_name}</td>
                      <td className="p-2 text-xs">{r.line_code}</td>
                      <td className="p-2">
                        <span className="text-slate-600">{r.requested_name}</span>
                        {r.matched_name && r.matched_name !== r.requested_name && (
                          <span className="text-emerald-700"> → {r.matched_name}</span>
                        )}
                      </td>
                      <td className="p-2">{r.qty_per_cycle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-xs text-slate-400">
          أتمتة: Vercel Cron يوم 2 من كل شهر 06:00 UTC · GitHub Action «Monthly Medication
          Report» · APIs{' '}
          <code>/api/reports/monthly</code> · <code>/api/reports/medications</code>
        </p>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
