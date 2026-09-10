import Link from 'next/link';
import { buildMonthlyReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  let report: Awaited<ReturnType<typeof buildMonthlyReport>> | null = null;
  let error: string | null = null;

  try {
    report = await buildMonthlyReport(period);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  const s = report?.summary;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تقرير الصرف الشهري</h1>
            <p className="text-sm text-slate-600">Monthly refill report · {period}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm items-center">
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
              تنزيل CSV
            </a>
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

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

            {report && report.top_meds.length > 0 && (
              <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">Top medications</th>
                      <th className="p-2 text-left">Lines</th>
                      <th className="p-2 text-left">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_meds.map((m) => (
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

            {report && report.cycles.length > 0 && (
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
                    {report.cycles.map((c: any) => (
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
