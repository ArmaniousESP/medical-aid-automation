import Link from 'next/link';
import { getReleaseCalendar } from '@/lib/careLine';

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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Care Line · تقويم الصرف</h1>
            <p className="text-sm text-slate-600">
              اتصال هاتفي · استحقاق الصرف الشهري · متابعة الالتزام (نمط PSP)
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/psp" className="text-blue-600 hover:underline">
              PSP
            </Link>
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              الصيدلية
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">الفترة</div>
            <div className="text-xl font-semibold">{period}</div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">نافذة الصرف المقترحة</div>
            <div className="text-sm font-medium">
              {cal?.release_window.from} → {cal?.release_window.to}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">مستحقون (غير مصروف)</div>
            <div className="text-xl font-semibold text-amber-700">{dueCount}</div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">المعروض</div>
            <div className="text-xl font-semibold">{rows.length}</div>
          </div>
        </div>

        <form className="flex flex-wrap gap-2 text-sm items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">الشهر</label>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded border px-2 py-1.5"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1.5 text-white"
          >
            عرض
          </button>
          <Link
            href={`/care-line?period=${period}&due=1`}
            className={`rounded-full px-3 py-1 border ${
              dueOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white'
            }`}
          >
            مستحقون فقط
          </Link>
          <Link
            href={`/care-line?period=${period}&due=0`}
            className={`rounded-full px-3 py-1 border ${!dueOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
          >
            الكل
          </Link>
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
                <th className="p-2">استحقاق</th>
                <th className="p-2">المريض</th>
                <th className="p-2">الموظف / هاتف</th>
                <th className="p-2">دورة {period}</th>
                <th className="p-2">PNAT</th>
                <th className="p-2">آخر اتصال</th>
                <th className="p-2">برنامج</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.program_id}
                  className={`border-t ${r.due ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="p-2 text-xs">
                    {r.due ? (
                      <span className="text-amber-700 font-medium">مستحق</span>
                    ) : (
                      <span className="text-emerald-700">تم</span>
                    )}
                  </td>
                  <td className="p-2 font-medium">{r.patient_name}</td>
                  <td className="p-2">
                    <div>{r.employee_name}</div>
                    <div className="text-xs text-slate-500">
                      {r.employee_id}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </div>
                  </td>
                  <td className="p-2 text-xs">
                    {r.cycle_status || '— لا دورة'}
                    {r.claim_id && (
                      <div className="font-mono text-[10px]">{r.claim_id}</div>
                    )}
                  </td>
                  <td className="p-2 text-xs">{r.latest_risk || '—'}</td>
                  <td className="p-2 text-xs text-slate-500">
                    {r.last_contact_at
                      ? String(r.last_contact_at).slice(0, 16).replace('T', ' ')
                      : '—'}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    <Link
                      href={`/programs/${r.program_id}`}
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
                    لا صفوف — ولّد دورات الشهر أو ألغِ فلتر المستحقين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          API: /api/care-line?calendar=1&period={period} · سجّل الاتصال من صفحة
          البرنامج
        </p>
      </div>
    </main>
  );
}
