import Link from 'next/link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  let rows: any[] = [];
  let error: string | null = null;
  const q = (searchParams.q || '').trim();
  const status = (searchParams.status || '').trim();

  try {
    const params: unknown[] = [];
    const where: string[] = [];

    if (status) {
      params.push(status);
      where.push(`cp.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      where.push(
        `(cp.program_code ILIKE $${i}
          OR e.full_name ILIKE $${i}
          OR e.external_employee_id ILIKE $${i}
          OR d.full_name ILIKE $${i})`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const res = await query(
      `SELECT
         cp.id,
         cp.program_code,
         cp.status,
         cp.start_date,
         cp.end_date,
         e.external_employee_id,
         e.full_name AS employee_name,
         d.full_name AS patient_name,
         d.relation,
         (SELECT count(*)::int FROM chronic_med_lines m
          WHERE m.program_id = cp.id AND m.is_active) AS med_count,
         (SELECT count(*)::int FROM refill_cycles rc WHERE rc.program_id = cp.id) AS refill_count,
         (SELECT count(*)::int FROM attachments a
          WHERE a.entity_type = 'program' AND a.entity_id = cp.id) AS doc_count
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       ${whereSql}
       ORDER BY cp.program_code`,
      params
    );
    rows = res.rows;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load programs';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">البرامج المزمنة</h1>
            <p className="text-sm text-slate-600">Chronic programs · Neon</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/documents" className="text-blue-600 hover:underline">
              التوثيق
            </Link>
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <form className="flex flex-wrap gap-2 items-center" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="بحث: اسم / رقم موظف / كود برنامج"
            className="rounded border px-3 py-2 text-sm min-w-[220px] flex-1"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded border px-2 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="cancelled">cancelled</option>
            <option value="expired">expired</option>
          </select>
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            بحث
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <strong>تعذر التحميل:</strong> {error}
          </div>
        )}

        {!error && rows.length === 0 && (
          <p className="text-sm text-slate-500">لا نتائج.</p>
        )}

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">الموظف</th>
                <th className="p-3">المريض</th>
                <th className="p-3">Status</th>
                <th className="p-3">أدوية</th>
                <th className="p-3">مستندات</th>
                <th className="p-3">دورات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">
                    <Link
                      href={`/programs/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.program_code}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div>{r.employee_name}</div>
                    <div className="text-xs text-slate-500">
                      {r.external_employee_id}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{r.patient_name}</div>
                    <div className="text-xs text-slate-500">{r.relation}</div>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">{r.med_count}</td>
                  <td className="p-3">
                    {r.doc_count > 0 ? (
                      <span className="text-emerald-700 font-medium">
                        {r.doc_count}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="p-3">{r.refill_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
