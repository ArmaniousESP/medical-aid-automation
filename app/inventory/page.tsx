import Link from 'next/link';
import { listMoves, listStock } from '@/lib/inventory';
import { ReceiveStockForm } from './ReceiveStockForm';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  let stock: Awaited<ReturnType<typeof listStock>> = [];
  let moves: any[] = [];
  let error: string | null = null;

  try {
    stock = await listStock();
    moves = (await listMoves({ limit: 20 })) as any[];
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  const low = stock.filter((s) => s.is_low);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">المخزون الدوائي</h1>
            <p className="text-sm text-slate-600">
              أرصدة · استلام · تنبيه حد أدنى · خصم تلقائي عند الصرف
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/pharmacy" className="text-blue-600 hover:underline">
              الصيدلية
            </Link>
            <Link href="/refills" className="text-blue-600 hover:underline">
              الصرف
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">أصناف نشطة</div>
            <div className="text-xl font-semibold">{stock.length}</div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">تحت الحد الأدنى</div>
            <div className={`text-xl font-semibold ${low.length ? 'text-amber-600' : ''}`}>
              {low.length}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">إجمالي وحدات</div>
            <div className="text-xl font-semibold">
              {stock.reduce((s, r) => s + r.qty_on_hand, 0)}
            </div>
          </div>
        </div>

        <ReceiveStockForm />

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">SKU</th>
                <th className="p-2">الدواء</th>
                <th className="p-2">الرصيد</th>
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
                  <td className="p-2">{s.min_qty}</td>
                  <td className="p-2">{s.unit}</td>
                  <td className="p-2 text-xs">
                    {s.is_low ? (
                      <span className="text-amber-700 font-medium">منخفض</span>
                    ) : (
                      <span className="text-emerald-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {stock.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500 text-center">
                    لا أصناف — أضف استلام أو اصرف دورة لإنشاء SKU تلقائياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">آخر الحركات</h2>
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
