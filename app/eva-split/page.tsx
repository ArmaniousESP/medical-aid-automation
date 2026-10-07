import Link from 'next/link';
import { splitFromDatabase } from '@/lib/evaSplit';
import { FlowSteps } from '../FlowSteps';
import { FormSelectPicker } from '@/components/FormSelectPicker';
import { EVA_BUCKET_OPTIONS } from '@/lib/optionLists';

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
        bucket === 'EVA' || bucket === 'NOT_EVA' ? (bucket as 'EVA' | 'NOT_EVA') : 'all',
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
        <header className="space-y-3">
          <FlowSteps current={3} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-violet-600 font-medium">
                Related to Step 3 · Pharmacy
              </p>
              <h1 className="text-2xl font-semibold">تقسيم الاعتماد — EVA</h1>
              <p className="text-sm text-slate-600">
                Available in EVA · NOT IN EVA (same cut as pharmacy CSV)
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/pharmacy"
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
              >
                Pharmacy pick list →
              </Link>
              <Link href="/claims" className="text-blue-600 hover:underline">
                ← Claims
              </Link>
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950 space-y-1">
          <p className="font-medium">How to use</p>
          <p className="text-xs sm:text-sm">
            Filter EVA or NOT EVA below → compare counts → for pharmacy routing
            prefer <strong>Pharmacy</strong> page CSV · EVA / CSV · NOT EVA.
          </p>
          <p className="text-xs text-teal-800" dir="rtl">
            صفّ إيفا / غير إيفا ← للتصدير استخدم شاشة الصيدلية
          </p>
        </div>

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
          <form className="flex flex-wrap gap-2 items-center" method="get">
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="بحث اسم / دواء / برنامج"
              className="rounded border px-3 py-1.5 text-sm min-w-[180px]"
            />
            <FormSelectPicker
              name="bucket"
              defaultValue={bucket === 'ALL' ? 'all' : bucket.toLowerCase() === 'all' ? 'all' : bucket}
              options={EVA_BUCKET_OPTIONS}
              allowCreate={false}
              placeholder="Bucket…"
              className="min-w-[160px]"
            />
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-1.5 text-white"
            >
              تطبيق
            </button>
          </form>
          <Link
            href="/pharmacy?formulary=EVA"
            className="rounded bg-teal-600 px-3 py-1.5 text-white text-xs"
          >
            Pharmacy · EVA
          </Link>
          <Link
            href="/pharmacy?formulary=NOT_EVA"
            className="rounded bg-slate-600 px-3 py-1.5 text-white text-xs"
          >
            Pharmacy · NOT EVA
          </Link>
        </div>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
            <p className="text-xs mt-1">
              Unlock on Home if needed ·{' '}
              <Link href="/status" className="underline">
                status
              </Link>
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-2">Bucket</th>
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
                    لا صفوف — تأكد من البرامج النشطة في Neon ·{' '}
                    <Link href="/intake-ops" className="text-blue-600 underline">
                      Queue
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          المصدر: قاعدة البيانات. للتصدير للصيدلية استخدم{' '}
          <Link href="/pharmacy" className="text-blue-600 underline">
            /pharmacy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
