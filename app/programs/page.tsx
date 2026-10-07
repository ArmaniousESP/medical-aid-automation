import Link from 'next/link';
import { query } from '@/lib/db';
import { FlowSteps } from '../FlowSteps';
import { FormSelectPicker } from '@/components/FormSelectPicker';
import { PROGRAM_STATUS_OPTIONS } from '@/lib/optionLists';

export const dynamic = 'force-dynamic';

type ProgramRow = {
  id: string;
  program_code: string;
  status: string;
  start_date?: string;
  end_date?: string;
  external_employee_id?: string;
  employee_name?: string;
  patient_name?: string;
  relation?: string;
  med_count?: number;
  refill_count?: number;
  doc_count?: number;
};

function statusStyle(s: string) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-900';
  if (s === 'suspended') return 'bg-amber-100 text-amber-900';
  if (s === 'cancelled' || s === 'expired') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  let rows: ProgramRow[] = [];
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
    rows = res.rows as ProgramRow[];
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load programs';
  }

  const activeCount = rows.filter((r) => r.status === 'active').length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={4} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Step 4 of 5
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Programs
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                البرامج المزمنة · بعد المعالجة
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/pharmacy"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                ← Pharmacy
              </Link>
              <Link
                href="/refills"
                className="rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800"
              >
                Next: Refills →
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-slate-800">Chronic enrollments</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {rows.length} shown
              {activeCount > 0 ? ` · ${activeCount} active` : ''}
            </p>
          </div>
          <Link
            href="/intake-ops"
            className="text-sm font-medium text-violet-700 hover:underline"
          >
            Process more from Queue
          </Link>
        </div>

        <form
          method="get"
          className="rounded-2xl border bg-white p-3 shadow-sm flex flex-wrap gap-2 items-center"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, emp ID, program code…"
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-4 py-2.5 text-base"
          />
          <FormSelectPicker
            name="status"
            defaultValue={status}
            options={PROGRAM_STATUS_OPTIONS}
            allowCreate={false}
            placeholder="Status…"
            className="min-w-[160px]"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['', 'All'],
              ['active', 'Active'],
              ['suspended', 'Suspended'],
            ] as const
          ).map(([s, label]) => (
            <Link
              key={s || 'all'}
              href={
                s
                  ? `/programs?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`
                  : `/programs${q ? `?q=${encodeURIComponent(q)}` : ''}`
              }
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                status === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <strong>Could not load:</strong> {error}
            <p className="mt-1 text-xs text-slate-600">
              Unlock on{' '}
              <Link href="/admin" className="underline text-violet-700">
                Admin
              </Link>{' '}
              if ops are locked.
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500 space-y-2">
            <p>No programs yet.</p>
            <p className="text-xs">
              Run <strong>Process queue</strong> on{' '}
              <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                intake queue
              </Link>
              .
            </p>
          </div>
        )}

        <div className="space-y-3 md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/programs/${r.id}`}
              className="block rounded-2xl border bg-white p-4 shadow-sm space-y-2 hover:border-violet-300"
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  {r.patient_name || '—'}
                </p>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full h-fit ${statusStyle(
                    r.status
                  )}`}
                >
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {r.employee_name}
                {r.external_employee_id ? ` · ${r.external_employee_id}` : ''}
              </p>
              <p className="text-[11px] font-mono text-violet-700">{r.program_code}</p>
              <p className="text-xs text-slate-500">
                {r.med_count ?? 0} meds · {r.refill_count ?? 0} refills
                {(r.doc_count ?? 0) > 0 ? ` · ${r.doc_count} docs` : ''}
              </p>
            </Link>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Code</th>
                  <th className="p-3 font-semibold">Employee</th>
                  <th className="p-3 font-semibold">Patient</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Meds</th>
                  <th className="p-3 font-semibold">Docs</th>
                  <th className="p-3 font-semibold">Refills</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-xs">
                      <Link
                        href={`/programs/${r.id}`}
                        className="text-violet-700 font-medium hover:underline"
                      >
                        {r.program_code}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.employee_name}</div>
                      <div className="text-xs text-slate-500">
                        {r.external_employee_id}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{r.patient_name}</div>
                      <div className="text-xs text-slate-500">{r.relation}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">{r.med_count}</td>
                    <td className="p-3">
                      {(r.doc_count ?? 0) > 0 ? (
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
        )}
      </div>
    </main>
  );
}
