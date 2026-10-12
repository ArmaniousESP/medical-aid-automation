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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={3} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Related to Step 3 · Pharmacy
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                EVA split · تقسيم الاعتماد
              </h1>
              <p className="text-sm text-slate-600">
                Available in EVA · NOT IN EVA (same cut as pharmacy CSV)
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/claims"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                ← Claims
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-xl bg-teal-600 px-3 py-2 font-semibold text-white hover:bg-teal-700"
              >
                Pharmacy →
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950 space-y-1">
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
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Available in EVA</div>
            <div className="text-2xl font-semibold text-emerald-700">
              {eva.length}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">NOT IN EVA</div>
            <div className="text-2xl font-semibold text-slate-700">
              {not_eva.length}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total · الإجمالي</div>
            <div className="text-2xl font-semibold">
              {eva.length + not_eva.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-sm rounded-2xl border bg-white p-3 shadow-sm">
          <form className="flex flex-wrap gap-2 items-center flex-1" method="get">
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="Search name / drug / program · بحث"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-base min-w-[180px] flex-1"
            />
            <FormSelectPicker
              name="bucket"
              defaultValue={
                bucket === 'ALL'
                  ? 'all'
                  : bucket.toLowerCase() === 'all'
                    ? 'all'
                    : bucket
              }
              options={EVA_BUCKET_OPTIONS}
              allowCreate={false}
              placeholder="Bucket…"
              className="min-w-[160px]"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Apply · تطبيق
            </button>
          </form>
          <Link
            href="/pharmacy?formulary=EVA"
            className="rounded-xl bg-teal-600 px-3 py-2 text-white text-xs font-semibold"
          >
            Pharmacy · EVA
          </Link>
          <Link
            href="/pharmacy?formulary=NOT_EVA"
            className="rounded-xl bg-slate-700 px-3 py-2 text-white text-xs font-semibold"
          >
            Pharmacy · NOT EVA
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
            <p className="text-xs mt-1">
              Unlock on Home if needed ·{' '}
              <Link href="/status" className="underline">
                status
              </Link>
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Bucket</th>
                <th className="p-3">Employee · الموظف</th>
                <th className="p-3">Patient · المريض</th>
                <th className="p-3">Drug · الدواء</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Program</th>
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
                  <td className="p-3">
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
                  <td className="p-3">
                    <div className="font-medium">{r.employee_name}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {r.employee_id}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{r.patient_name}</div>
                    <div className="text-xs text-slate-500">{r.relation}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.matched_name}</div>
                    {r.requested_name !== r.matched_name && (
                      <div className="text-xs text-slate-500">
                        Requested: {r.requested_name}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{r.qty}</td>
                  <td className="p-3 font-mono text-xs">{r.program_code}</td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No rows — check active programs ·{' '}
                    <Link href="/intake-ops" className="text-violet-700 underline">
                      Queue
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          Source: Neon. For pharmacy CSV use{' '}
          <Link href="/pharmacy" className="text-violet-700 underline">
            /pharmacy
          </Link>
          .
        </p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-6xl flex gap-2">
          <Link
            href="/claims"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Claims
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
