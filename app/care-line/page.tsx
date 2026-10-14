import Link from 'next/link';
import { getReleaseCalendar } from '@/lib/careLine';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function CareLinePage({
  searchParams,
}: {
  searchParams: { period?: string; due?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const dueOnly = searchParams.due !== '0';

  let cal: Awaited<ReturnType<typeof getReleaseCalendar>> | null = null;
  let error: string | null = null;

  try {
    cal = await getReleaseCalendar({ period, limit: 250 });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل';
  }

  const rows = (cal?.rows || []).filter((r) => (dueOnly ? r.due : true));
  const dueCount = (cal?.rows || []).filter((r) => r.due).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={4} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Related to Programs · Care line
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Care Line · تقويم الصرف
              </h1>
              <p className="text-sm text-slate-600">
                Phone contact · monthly release window · adherence follow-up
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/programs"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                ← Programs
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-xl bg-teal-600 px-3 py-2 font-semibold text-white"
              >
                Pharmacy →
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Period · الفترة</div>
            <div className="text-xl font-semibold">{period}</div>
          </div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Release window</div>
            <div className="text-sm font-medium">
              {cal?.release_window.from} → {cal?.release_window.to}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Due (not dispensed)</div>
            <div className="text-xl font-semibold text-amber-700">{dueCount}</div>
          </div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Shown · المعروض</div>
            <div className="text-xl font-semibold">{rows.length}</div>
          </div>
        </div>

        <form className="flex flex-wrap gap-2 text-sm items-end rounded-2xl border bg-white p-3 shadow-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Month · الشهر</label>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white font-semibold"
          >
            Show · عرض
          </button>
          <Link
            href={`/care-line?period=${period}&due=1`}
            className={`rounded-full px-3 py-1.5 border text-xs font-semibold ${
              dueOnly
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white border-slate-200'
            }`}
          >
            Due only
          </Link>
          <Link
            href={`/care-line?period=${period}&due=0`}
            className={`rounded-full px-3 py-1.5 border text-xs font-semibold ${
              !dueOnly
                ? 'bg-violet-700 text-white border-violet-700'
                : 'bg-white border-slate-200'
            }`}
          >
            All
          </Link>
        </form>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Due</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Employee / phone</th>
                <th className="p-3">Cycle {period}</th>
                <th className="p-3">Risk</th>
                <th className="p-3">Last contact</th>
                <th className="p-3">Program</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.program_id}
                  className={`border-t ${r.due ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="p-3 text-xs">
                    {r.due ? (
                      <span className="text-amber-700 font-medium">Due</span>
                    ) : (
                      <span className="text-emerald-700">Done</span>
                    )}
                  </td>
                  <td className="p-3 font-medium">{r.patient_name}</td>
                  <td className="p-3">
                    <div>{r.employee_name}</div>
                    <div className="text-xs text-slate-500">
                      {r.employee_id}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    {r.cycle_status || '— no cycle'}
                    {r.claim_id && (
                      <div className="font-mono text-[10px]">{r.claim_id}</div>
                    )}
                  </td>
                  <td className="p-3 text-xs">{r.latest_risk || '—'}</td>
                  <td className="p-3 text-xs text-slate-500">
                    {r.last_contact_at
                      ? String(r.last_contact_at).slice(0, 16).replace('T', ' ')
                      : '—'}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <Link
                      href={`/programs/${r.program_id}`}
                      className="text-violet-700 hover:underline"
                    >
                      {r.program_code}
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No rows — generate monthly cycles or clear the due filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          API: /api/care-line?calendar=1&period={period} · log contact from program
          file
        </p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-6xl flex gap-2">
          <Link
            href="/programs"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Programs
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
