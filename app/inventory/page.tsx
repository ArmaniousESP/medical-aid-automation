import Link from 'next/link';
import { inventorySummary, listMoves, listStock } from '@/lib/inventory';
import { ReceiveStockForm } from './ReceiveStockForm';
import { InventoryActions } from './InventoryActions';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { low?: string; q?: string };
}) {
  const lowOnly = searchParams.low === '1';
  const q = searchParams.q || undefined;

  let stock: Awaited<ReturnType<typeof listStock>> = [];
  let moves: any[] = [];
  let summary: Awaited<ReturnType<typeof inventorySummary>> | null = null;
  let error: string | null = null;

  try {
    stock = await listStock({ lowOnly, q });
    moves = (await listMoves({ limit: 25 })) as any[];
    summary = await inventorySummary();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">إدارة المخزون الصيدلاني</h1>
            <p className="text-sm text-slate-600">
              استلام · تسوية · حد أدنى · خصم عند الصرف · تصدير CSV
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              الصيدلية
            </Link>
            <Link href="/requests" className="text-blue-600 hover:underline">
              الطلبات
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">أصناف</div>
              <div className="text-xl font-semibold">{summary.skus}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">تحت الحد الأدنى</div>
              <div
                className={`text-xl font-semibold ${
                  summary.low_count ? 'text-amber-600' : ''
                }`}
              >
                {summary.low_count}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">رصيد صفري</div>
              <div className="text-xl font-semibold">{summary.zero_stock}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">إجمالي وحدات</div>
              <div className="text-xl font-semibold">{summary.total_units}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center text-sm">
          <form className="flex gap-2 items-center">
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="بحث دواء / SKU"
              className="rounded border px-2 py-1.5"
            />
            <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 text-white">
              بحث
            </button>
          </form>
          <Link
            href={lowOnly ? '/inventory' : '/inventory?low=1'}
            className={`rounded-full px-3 py-1 border ${
              lowOnly
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white'
            }`}
          >
            {lowOnly ? 'عرض الكل' : 'منخفض فقط'}
          </Link>
          <a
            href="/api/inventory?format=csv"
            className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
          >
            تصدير CSV
          </a>
          <InventoryActions />
        </div>

        <ReceiveStockForm />

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">SKU</th>
                <th className="p-2">الدواء</th>
                <th className="p-2">رصيد</th>
                <th className="p-2">متاح</th>
                <th className="p-2">حد أدنى</th>
                <th className="p-2">وحدة</th>
                <th className="p-2">حالة</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t ${s.is_low ? 'bg-amber-50' : ''}`}
                >
                  <td className="p-2 font-mono text-xs">{s.sku_code}</td>
                  <td className="p-2 font-medium">{s.drug_name}</td>
                  <td className="p-2">{s.qty_on_hand}</td>
                  <td className="p-2">{s.qty_available}</td>
                  <td className="p-2">{s.min_qty}</td>
                  <td className="p-2">{s.unit}</td>
                  <td className="p-2 text-xs">
                    {s.qty_on_hand <= 0 ? (
                      <span className="text-red-700 font-medium">نفد</span>
                    ) : s.is_low ? (
                      <span className="text-amber-700 font-medium">منخفض</span>
                    ) : (
                      <span className="text-emerald-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {stock.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500 text-center">
                    لا أصناف — اضغط «بذر من الوصفات» أو استلم مخزون
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
            دفتر الحركات
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">وقت</th>
                <th className="p-2">نوع</th>
                <th className="p-2">دواء</th>
                <th className="p-2">كمية</th>
                <th className="p-2">بعد</th>
                <th className="p-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m: any) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2 text-xs whitespace-nowrap">
                    {String(m.created_at).slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="p-2 text-xs">{m.move_type}</td>
                  <td className="p-2">{m.drug_name}</td>
                  <td className="p-2">{m.qty}</td>
                  <td className="p-2">{m.balance_after}</td>
                  <td className="p-2 text-xs text-slate-500">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
