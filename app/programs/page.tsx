import Link from 'next/link';
import { query } from '@/lib/db';
import { FlowSteps } from '../FlowSteps';
import { FormSelectPicker } from '@/components/FormSelectPicker';
import { PROGRAM_STATUS_OPTIONS } from '@/lib/optionLists';
import { isWhoAssessmentEnabled } from '@/lib/featureFlags';

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
  latest_risk?: string | null;
};

function statusStyle(s: string) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
  if (s === 'suspended') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (s === 'cancelled' || s === 'expired')
    return 'bg-slate-200 text-slate-700 ring-1 ring-slate-300';
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

function riskStyle(s?: string | null) {
  if (s === 'critical') return 'bg-red-100 text-red-900 ring-1 ring-red-200';
  if (s === 'high') return 'bg-orange-100 text-orange-950 ring-1 ring-orange-200';
  if (s === 'medium') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
  if (s === 'low') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100';
  return 'bg-slate-50 text-slate-500 ring-1 ring-slate-100';
}

function riskRank(s?: string | null) {
  if (s === 'critical') return 0;
  if (s === 'high') return 1;
  if (s === 'medium') return 2;
  if (s === 'low') return 3;
  return 4;
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; risk?: string };
}) {
  let rows: ProgramRow[] = [];
  let error: string | null = null;
  const q = (searchParams.q || '').trim();
  const status = (searchParams.status || '').trim();
  const risk = (searchParams.risk || '').trim();
  const whoOn = isWhoAssessmentEnabled();

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
          WHERE a.entity_type = 'program' AND a.entity_id = cp.id) AS doc_count,
         (SELECT risk_band FROM adherence_assessments aa
          WHERE aa.program_id = cp.id
          ORDER BY assessed_at DESC LIMIT 1) AS latest_risk
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       ${whereSql}
       ORDER BY cp.program_code`,
      params
    );
    rows = res.rows as ProgramRow[];
    if (whoOn) {
      rows = [...rows].sort((a, b) => {
        const d = riskRank(a.latest_risk) - riskRank(b.latest_risk);
        if (d !== 0) return d;
        return (a.program_code || '').localeCompare(b.program_code || '');
      });
      if (risk === 'high') {
        rows = rows.filter(
          (r) => r.latest_risk === 'high' || r.latest_risk === 'critical'
        );
      } else if (risk === 'unassessed') {
        rows = rows.filter((r) => !r.latest_risk);
      } else if (risk) {
        rows = rows.filter((r) => r.latest_risk === risk);
      }
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load programs';
  }

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const suspendedCount = rows.filter((r) => r.status === 'suspended').length;
  const highRiskCount = whoOn
    ? rows.filter(
        (r) => r.latest_risk === 'high' || r.latest_risk === 'critical'
      ).length
    : 0;

  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <FlowSteps current={4} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="aid-section-label">Step 4 of 5 · Programs</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Programs
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                البرامج المزمنة · بعد المعالجة
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/pharmacy"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                ← Pharmacy
              </Link>
              <Link href="/refills" className="aid-cta-violet px-4 py-2 text-sm">
                Next: Refills →
              </Link>
            </div>
          </div>
        </header>

        <div className={`grid gap-2 text-center ${whoOn ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div className="aid-kpi">
            <p className="text-xl font-bold text-slate-900">{rows.length}</p>
            <p className="text-[11px] text-slate-500">shown</p>
          </div>
          <div className="aid-kpi">
            <p className="text-xl font-bold text-emerald-800">{activeCount}</p>
            <p className="text-[11px] text-slate-500">active</p>
          </div>
          <div className="aid-kpi">
            <p className="text-xl font-bold text-amber-800">{suspendedCount}</p>
            <p className="text-[11px] text-slate-500">suspended</p>
          </div>
          {whoOn && (
            <div className="aid-kpi">
              <p className="text-xl font-bold text-orange-800">{highRiskCount}</p>
              <p className="text-[11px] text-slate-500">high risk</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 backdrop-blur">
          <div className="text-sm">
            <p className="font-medium text-slate-800">Chronic enrollments</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {whoOn
                ? 'Sorted by adherence risk · open a row for assessment & coach'
                : 'Tap a row to open the program file'}
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
          className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm flex flex-wrap gap-2 items-center backdrop-blur"
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
          {whoOn && risk ? (
            <input type="hidden" name="risk" value={risk} />
          ) : null}
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
              href={(() => {
                const params = new URLSearchParams();
                if (s) params.set('status', s);
                if (q) params.set('q', q);
                if (whoOn && risk) params.set('risk', risk);
                const qs = params.toString();
                return qs ? `/programs?${qs}` : '/programs';
              })()}
              className={`min-h-[2.5rem] rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                status === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white/90 border-slate-200 text-slate-600'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {whoOn && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['', 'Any risk'],
                ['high', 'High / critical'],
                ['medium', 'Medium'],
                ['low', 'Low'],
                ['unassessed', 'Not assessed'],
              ] as const
            ).map(([rk, label]) => {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (q) params.set('q', q);
              if (rk) params.set('risk', rk);
              const qs = params.toString();
              return (
                <Link
                  key={rk || 'any-risk'}
                  href={qs ? `/programs?${qs}` : '/programs'}
                  className={`min-h-[2.25rem] rounded-full px-3 py-1 text-xs font-semibold border ${
                    risk === rk
                      ? 'bg-orange-700 text-white border-orange-700'
                      : 'bg-white/90 border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500 space-y-2 backdrop-blur">
            <p className="text-2xl" aria-hidden>
              ○
            </p>
            <p className="font-medium text-slate-700">No programs yet</p>
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
              className="block rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-2 hover:border-violet-300 backdrop-blur active:bg-white"
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-slate-900 truncate">
                  {r.patient_name || '—'}
                </p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  {whoOn && r.latest_risk && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskStyle(
                        r.latest_risk
                      )}`}
                    >
                      {r.latest_risk}
                    </span>
                  )}
                </div>
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
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Code</th>
                  <th className="p-3 font-semibold">Employee</th>
                  <th className="p-3 font-semibold">Patient</th>
                  <th className="p-3 font-semibold">Status</th>
                  {whoOn && <th className="p-3 font-semibold">Risk</th>}
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
                    {whoOn && (
                      <td className="p-3">
                        {r.latest_risk ? (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${riskStyle(
                              r.latest_risk
                            )}`}
                          >
                            {r.latest_risk}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    )}
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

      <div className="aid-sticky-bar">
        <div className="mx-auto max-w-5xl flex gap-2">
          <Link
            href="/pharmacy"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Pharmacy
          </Link>
          <Link
            href="/refills"
            className="aid-cta-violet flex-1 py-3 text-center text-sm"
          >
            Refills →
          </Link>
        </div>
      </div>
    </main>
  );
}
