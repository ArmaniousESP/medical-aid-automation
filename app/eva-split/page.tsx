import Link from 'next/link';
import { splitFromDatabase } from '@/lib/evaSplit';

export const dynamic = 'force-dynamic';

export default async function EvaSplitPage({
  searchParams,
}: {
  searchParams: { bucket?: string; q?: string };
}) {
  const bucket = (searchParams.bucket || 'all').toUpperCase();
  const q = searchParams.q || undefined;

  let eva: Awaited<ReturnType<typeof splitFromDatabase>>['eva'] = [];
  let not_eva: Awaited<ReturnType<typeof splitFromDatabase>>['not_eva'] = [];
  let error: string | null = null;

  try {
    const data = await splitFromDatabase({
      bucket:
        bucket === 'EVA' || bucket === 'NOT_EVA' ? (bucket as any) : 'all',
      q,
    });
    eva = data.eva;
    not_eva = data.not_eva;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل التحميل';
  }

  const showEva = bucket !== 'NOT_EVA';
  const showNot = bucket !== 'EVA';
  const rows = [
    ...(showEva ? eva.map((r) => ({ ...r, _b: 'EVA' as const })) : []),
    ...(showNot ? not_eva.map((r) => ({ ...r, _b: 'NOT_EVA' as const })) : []),
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تقسيم الاعتماد — EVA</h1>
            <p className="text-sm text-slate-600">
              Approved-Requests مقسّمة: Available in EVA · NOT IN EVA
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              الصيدلية
            </Link>
            <Link href="/requests" className="text-blue-600 hover:underline">
              الطلبات
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Available in EVA</div>
            <div className="text-2xl font-semibold text-emerald-700">
              {eva.length}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">NOT IN EVA</div>
            <div className="text-2xl font-semibold text-slate-700">
              {not_eva.length}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">الإجمالي</div>
            <div className="text-2xl font-semibold">
              {eva.length + not_eva.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-sm">
          <form className="flex gap-2 items-center">
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="بحث موظف / مريض / دواء"
              className="rounded border px-2 py-1.5 min-w-[200px]"
            />
            {bucket !== 'all' && (
              <input type="hidden" name="bucket" value={bucket} />
            )}
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-1.5 text-white"
            >
              بحث
            </button>
          </form>

          {(
            [
              ['all', 'الكل'],
              ['EVA', 'Available in EVA'],
              ['NOT_EVA', 'NOT IN EVA'],
            ] as const
          ).map(([b, label]) => (
            <Link
              key={b}
              href={b === 'all' ? '/eva-split' : `/eva-split?bucket=${b}`}
              className={`rounded-full px-3 py-1 border ${
                bucket === b || (b === 'all' && bucket === 'ALL')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}

          <a
            href="/api/eva-split?bucket=EVA&format=csv"
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
          >
            CSV · EVA
          </a>
          <a
            href="/api/eva-split?bucket=NOT_EVA&format=csv"
            className="rounded bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-800"
          >
            CSV · NOT EVA
          </a>
          <a
            href="/api/eva-split?format=csv"
            className="rounded border bg-white px-3 py-1.5 hover:bg-slate-50"
          >
            CSV · الكل
          </a>
        </div>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">القائمة</th>
                <th className="p-2">الموظف</th>
                <th className="p-2">المريض</th>
                <th className="p-2">الدواء</th>
                <th className="p-2">كمية</th>
                <th className="p-2">البرنامج</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.program_code}-${r.line_code}-${i}`}
                  className={`border-t ${
                    r._b === 'EVA' ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <td className="p-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r._b === 'EVA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r._b === 'EVA' ? 'EVA' : 'NOT EVA'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{r.employee_name}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {r.employee_id}
                    </div>
                  </td>
                  <td className="p-2">
                    <div>{r.patient_name}</div>
                    <div className="text-xs text-slate-500">{r.relation}</div>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{r.matched_name}</div>
                    {r.requested_name !== r.matched_name && (
                      <div className="text-xs text-slate-500">
                        طلب: {r.requested_name}
                      </div>
                    )}
                  </td>
                  <td className="p-2">{r.qty}</td>
                  <td className="p-2 font-mono text-xs">{r.program_code}</td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    لا صفوف — تأكد من استيراد Approved-Requests إلى Neon
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          المصدر: قاعدة البيانات (بعد الاستيراد). مع Google:{' '}
          <code>/api/eva-split?source=sheet</code>
        </p>
      </div>
    </main>
  );
}
