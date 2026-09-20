import Link from 'next/link';
import { buildPharmacyPickList } from '@/lib/pharmacy';
import { PharmacyBatchButton } from './PharmacyBatchButton';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: { period?: string; status?: string; formulary?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  const status = searchParams.status || undefined;
  const formularyRaw = (searchParams.formulary || 'all').toUpperCase();
  const formulary =
    formularyRaw === 'EVA' || formularyRaw === 'NOT_EVA'
      ? (formularyRaw as 'EVA' | 'NOT_EVA')
      : 'all';

  let lines: Awaited<ReturnType<typeof buildPharmacyPickList>> = [];
  let error: string | null = null;

  try {
    lines = await buildPharmacyPickList({
      period,
      status,
      includePending: !status,
      formulary,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  const groups = new Map<string, typeof lines>();
  for (const line of lines) {
    const key = line.cycle_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ period, ...extra });
    if (status) p.set('status', status);
    if (formulary !== 'all' && !extra.formulary) p.set('formulary', formulary);
    return p.toString();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">الصيدلية — قائمة التحضير</h1>
            <p className="text-sm text-slate-600">
              Pick list · EVA / NOT EVA · صرف دفعة · {period}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/eva-split" className="text-blue-600 hover:underline">
              تقسيم EVA
            </Link>
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 items-center text-sm">
          <form className="flex gap-2 items-center">
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded border px-2 py-1"
            />
            {formulary !== 'all' && (
              <input type="hidden" name="formulary" value={formulary} />
            )}
            {status && <input type="hidden" name="status" value={status} />}
            <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white">
              عرض
            </button>
          </form>
          <a
            href={`/api/pharmacy/pick-list?period=${period}&format=csv&includePending=true&formulary=${formulary}`}
            className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
          >
            CSV صيدلية
          </a>
          <a
            href={`/api/pharmacy/pick-list?period=${period}&format=csv&includePending=true&formulary=EVA`}
            className="rounded bg-teal-600 px-3 py-1 text-white hover:bg-teal-700"
          >
            CSV · EVA
          </a>
          <a
            href={`/api/pharmacy/pick-list?period=${period}&format=csv&includePending=true&formulary=NOT_EVA`}
            className="rounded bg-slate-600 px-3 py-1 text-white hover:bg-slate-700"
          >
            CSV · NOT EVA
          </a>
          <PharmacyBatchButton period={period} />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-slate-500 self-center">Formulary:</span>
          {(
            [
              ['all', 'الكل'],
              ['EVA', 'Available in EVA'],
              ['NOT_EVA', 'NOT IN EVA'],
            ] as const
          ).map(([f, label]) => (
            <Link
              key={f}
              href={`/pharmacy?${qs({ formulary: f === 'all' ? '' : f }).replace(
                'formulary=&',
                ''
              )}`}
              className={`rounded-full px-3 py-1 border ${
                formulary === f || (f === 'all' && formulary === 'all')
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ['', 'كل الحالات'],
            ['in_review', 'قيد المراجعة'],
            ['approved', 'معتمد'],
            ['dispensed', 'مصروف'],
          ].map(([s, label]) => (
            <Link
              key={s || 'all'}
              href={
                s
                  ? `/pharmacy?period=${period}&status=${s}${formulary !== 'all' ? `&formulary=${formulary}` : ''}`
                  : `/pharmacy?period=${period}${formulary !== 'all' ? `&formulary=${formulary}` : ''}`
              }
              className={`rounded-full px-3 py-1 border ${
                (status || '') === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">{error}</div>
        )}

        {!error && groups.size === 0 && (
          <p className="text-slate-500 text-sm">
            لا بنود لهذه الفترة/الفلتر. ولّد دورات الصرف أولاً أو غيّر الفلتر.
          </p>
        )}

        <p className="text-xs text-slate-500">{lines.length} بند · {groups.size} مطالبة</p>

        {Array.from(groups.entries()).map(([cycleId, group]) => {
          const head = group[0];
          return (
            <div key={cycleId} className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <div className="font-semibold">{head.patient_name}</div>
                  <div className="text-xs text-slate-600">
                    {head.employee_name} · {head.program_code} · {head.relation}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">{head.claim_id}</div>
                  <div className="text-xs mt-1">
                    <span className="rounded bg-white px-2 py-0.5 border">{head.cycle_status}</span>
                  </div>
                  <Link
                    href={`/refills/${cycleId}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    تفاصيل الدورة
                  </Link>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                  <tr>
                    <th className="p-2">Line</th>
                    <th className="p-2">الدواء</th>
                    <th className="p-2">كمية</th>
                    <th className="p-2">Formulary</th>
                    <th className="p-2">حالة</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((l) => (
                    <tr key={`${l.cycle_id}-${l.line_code}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{l.line_code}</td>
                      <td className="p-2 font-medium">{l.drug_name}</td>
                      <td className="p-2">{l.dispensed_qty ?? l.approved_qty ?? l.qty}</td>
                      <td className="p-2 text-xs">
                        {l.company_preferred ? (
                          <span className="text-emerald-700 font-medium">EVA</span>
                        ) : (
                          <span className="text-slate-600">NOT EVA</span>
                        )}
                      </td>
                      <td className="p-2 text-xs">{l.item_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </main>
  );
}
