import Link from 'next/link';
import { buildPharmacyPickList } from '@/lib/pharmacy';
import { PharmacyBatchButton } from './PharmacyBatchButton';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: { period?: string; status?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const status = searchParams.status || undefined;

  let lines: Awaited<ReturnType<typeof buildPharmacyPickList>> = [];
  let error: string | null = null;

  try {
    lines = await buildPharmacyPickList({
      period,
      status,
      includePending: !status,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  // Group by claim / cycle
  const groups = new Map<string, typeof lines>();
  for (const line of lines) {
    const key = line.cycle_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">الصيدلية — قائمة التحضير</h1>
            <p className="text-sm text-slate-600">
              Pick list · اعتماد وصرف دفعة · CSV للصيدلية · {period}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/reports" className="text-blue-600 hover:underline">
              التقارير
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 items-center text-sm">
          <form className="flex gap-2 items-center">
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded border px-2 py-1"
            />
            <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white">
              عرض
            </button>
          </form>
          <a
            href={`/api/pharmacy/pick-list?period=${period}&format=csv&includePending=true`}
            className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
          >
            تنزيل CSV صيدلية
          </a>
          <PharmacyBatchButton period={period} />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ['', 'الكل'],
            ['in_review', 'قيد المراجعة'],
            ['approved', 'معتمد'],
            ['dispensed', 'مصروف'],
          ].map(([s, label]) => (
            <Link
              key={s || 'all'}
              href={s ? `/pharmacy?period=${period}&status=${s}` : `/pharmacy?period=${period}`}
              className={`rounded-full px-3 py-1 border ${
                (status || '') === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">{error}</div>
        )}

        {!error && groups.size === 0 && (
          <p className="text-slate-500 text-sm">لا بنود لهذه الفترة.</p>
        )}

        {Array.from(groups.entries()).map(([cycleId, group]) => {
          const head = group[0];
          return (
            <div key={cycleId} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <div className="font-semibold">{head.patient_name}</div>
                  <div className="text-xs text-slate-600">
                    {head.employee_name} · {head.program_code} · {head.relation}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">{head.claim_id}</div>
                  <div className="text-xs mt-1">
                    <span className="rounded bg-white px-2 py-0.5 border">{head.cycle_status}</span>
                  </div>
                  <Link
                    href={`/refills/${cycleId}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    تفاصيل الدورة
                  </Link>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">الدواء</th>
                    <th className="p-2">كمية</th>
                    <th className="p-2">أيام</th>
                    <th className="p-2">Formulary</th>
                    <th className="p-2">حالة البند</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((l) => (
                    <tr key={`${l.cycle_id}-${l.line_code}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{l.line_code}</td>
                      <td className="p-2 font-medium">{l.drug_name}</td>
                      <td className="p-2">{l.dispensed_qty ?? l.approved_qty ?? l.qty}</td>
                      <td className="p-2">{l.days_supply ?? '—'}</td>
                      <td className="p-2 text-xs">
                        {l.company_preferred ? (
                          <span className="text-emerald-700">EVA</span>
                        ) : (
                          l.formulary_flag || '—'
                        )}
                      </td>
                      <td className="p-2 text-xs">{l.item_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </main>
  );
}
