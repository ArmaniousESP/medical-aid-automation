import Link from 'next/link';
import { listRequestStatuses, requestStatusSummary } from '@/lib/requestStatus';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STAGE_COLORS: Record<string, string> = {
  awaiting_refill: 'bg-slate-100 text-slate-700',
  enrolled: 'bg-slate-100 text-slate-700',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  partially_approved: 'bg-indigo-100 text-indigo-800',
  dispensing: 'bg-violet-100 text-violet-800',
  dispensed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  expired: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-slate-200 text-slate-500',
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { period?: string; stage?: string; q?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const stage = searchParams.stage || undefined;
  const q = searchParams.q || undefined;

  let rows: Awaited<ReturnType<typeof listRequestStatuses>>['rows'] = [];
  let summary: Awaited<ReturnType<typeof requestStatusSummary>> | null = null;
  let error: string | null = null;

  try {
    const list = await listRequestStatuses({ period, stage, q, limit: 300 });
    rows = list.rows;
    summary = await requestStatusSummary(period);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل التحميل';
  }

  const stages = [
    ['', 'الكل'],
    ['awaiting_refill', 'بانتظار صرف'],
    ['in_review', 'قيد المراجعة'],
    ['approved', 'معتمد'],
    ['dispensed', 'مصروف'],
    ['rejected', 'مرفوض'],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تتبع حالة الطلبات</h1>
            <p className="text-sm text-slate-600">
              من التسجيل حتى الصرف · الفترة {period}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              الصيدلية
            </Link>
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
          <div>
            <label className="block text-xs text-slate-500 mb-1">بحث</label>
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="اسم / كود موظف / برنامج"
              className="rounded border px-2 py-1.5 min-w-[180px]"
            />
          </div>
          {stage && <input type="hidden" name="stage" value={stage} />}
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1.5 text-white"
          >
            عرض
          </button>
        </form>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">إجمالي البرامج</div>
              <div className="text-xl font-semibold">{summary.total}</div>
            </div>
            {Object.entries(summary.by_stage).map(([s, n]) => (
              <Link
                key={s}
                href={`/requests?period=${period}&stage=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className="rounded-lg border bg-white p-3 shadow-sm hover:border-blue-300"
              >
                <div className="text-xs text-slate-500">{s}</div>
                <div className="text-xl font-semibold">{n}</div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-sm">
          {stages.map(([s, label]) => (
            <Link
              key={s || 'all'}
              href={
                s
                  ? `/requests?period=${period}&stage=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`
                  : `/requests?period=${period}${q ? `&q=${encodeURIComponent(q)}` : ''}`
              }
              className={`rounded-full px-3 py-1 border ${
                (stage || '') === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}
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
                <th className="p-2">الحالة</th>
                <th className="p-2">المريض</th>
                <th className="p-2">الموظف</th>
                <th className="p-2">البرنامج</th>
                <th className="p-2">أدوية</th>
                <th className="p-2">المطالبة</th>
                <th className="p-2">تواريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.program_id} className="border-t hover:bg-slate-50">
                  <td className="p-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STAGE_COLORS[r.stage] || 'bg-slate-100'
                      }`}
                    >
                      {r.stage_label_ar}
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
                  <td className="p-2">
                    <Link
                      href={`/programs/${r.program_id}`}
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      {r.program_code}
                    </Link>
                  </td>
                  <td className="p-2">{r.med_count}</td>
                  <td className="p-2 font-mono text-xs">
                    {r.cycle_id ? (
                      <Link
                        href={`/refills/${r.cycle_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.claim_id || r.cycle_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-slate-500 whitespace-nowrap">
                    {r.requested_at && (
                      <div>طلب: {String(r.requested_at).slice(0, 10)}</div>
                    )}
                    {r.dispensed_at && (
                      <div>صرف: {String(r.dispensed_at).slice(0, 10)}</div>
                    )}
                    {!r.requested_at && !r.dispensed_at && '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    لا طلبات مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          API: /api/requests?period={period}&summary=1
        </p>
      </div>
    </main>
  );
}
