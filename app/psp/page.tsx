import Link from 'next/link';
import {
  ELIGIBILITY_LABELS_AR,
  JOURNEY_LABELS_AR,
  JOURNEY_STAGES,
  listPspPrograms,
  pspSummary,
} from '@/lib/psp';

export const dynamic = 'force-dynamic';

export default async function PspPage({
  searchParams,
}: {
  searchParams: { stage?: string; q?: string };
}) {
  const stage = searchParams.stage || undefined;
  const q = searchParams.q || undefined;

  let rows: any[] = [];
  let summary: Awaited<ReturnType<typeof pspSummary>> | null = null;
  let error: string | null = null;

  try {
    rows = await listPspPrograms({ stage, q, limit: 200 });
    summary = await pspSummary();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              برنامج دعم المرضى (PSP)
            </h1>
            <p className="text-sm text-slate-600">
              معمارية Axios · رحلة المريض · أهلية · التزام بالعلاج
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/programs" className="text-blue-600 hover:underline">
              البرامج
            </Link>
            <Link href="/documents" className="text-blue-600 hover:underline">
              التوثيق
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="rounded-lg border bg-white p-4 text-sm text-slate-700 shadow-sm space-y-2">
          <p className="font-medium">حلقة Axios الثلاثية</p>
          <ol className="list-decimal list-inside text-slate-600 space-y-1">
            <li>استراتيجية الوصول — أهلية + Formulary (EVA)</li>
            <li>التفعيل — تسجيل · أدوية · روشتات · صرف</li>
            <li>التحسين — تحليلات · مخزون · متابعة التزام</li>
          </ol>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(summary.by_stage).map(([s, n]) => (
              <Link
                key={s}
                href={`/psp?stage=${s}`}
                className="rounded-lg border bg-white p-3 shadow-sm hover:border-blue-300"
              >
                <div className="text-xs text-slate-500">
                  {JOURNEY_LABELS_AR[s] || s}
                </div>
                <div className="text-xl font-semibold">{n}</div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/psp"
            className={`rounded-full px-3 py-1 border ${
              !stage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'
            }`}
          >
            الكل
          </Link>
          {JOURNEY_STAGES.map((s) => (
            <Link
              key={s}
              href={`/psp?stage=${s}`}
              className={`rounded-full px-3 py-1 border ${
                stage === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white'
              }`}
            >
              {JOURNEY_LABELS_AR[s]}
            </Link>
          ))}
        </div>

        <form className="flex gap-2 text-sm">
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="بحث مريض / موظف / برنامج"
            className="rounded border px-2 py-1.5 min-w-[200px]"
          />
          {stage && <input type="hidden" name="stage" value={stage} />}
          <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-white">
            بحث
          </button>
        </form>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">المرحلة</th>
                <th className="p-2">المريض</th>
                <th className="p-2">الموظف</th>
                <th className="p-2">أهلية</th>
                <th className="p-2">أدوية</th>
                <th className="p-2">مستندات</th>
                <th className="p-2">البرنامج</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-2">
                    <span className="rounded-full bg-indigo-50 text-indigo-800 px-2 py-0.5 text-xs">
                      {JOURNEY_LABELS_AR[r.journey_stage] || r.journey_stage}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{r.patient_name}</div>
                    <div className="text-xs text-slate-500">{r.relation}</div>
                  </td>
                  <td className="p-2">
                    <div>{r.employee_name}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {r.employee_id}
                    </div>
                  </td>
                  <td className="p-2 text-xs">
                    {ELIGIBILITY_LABELS_AR[r.eligibility_tier] ||
                      r.eligibility_tier}
                  </td>
                  <td className="p-2">{r.med_count}</td>
                  <td className="p-2">{r.doc_count}</td>
                  <td className="p-2 font-mono text-xs">
                    <Link
                      href={`/programs/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.program_code}
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    لا برامج — بعد التطبيق ستظهر البرامج المسجّلة كـ «مسجّل»
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          مرجع: docs/axios-psp-architecture.md · API /api/psp
        </p>
      </div>
    </main>
  );
}
