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
  let moves: Awaited<ReturnType<typeof listMoves>> = [];
  let summary: Awaited<ReturnType<typeof inventorySummary>> | null = null;
  let error: string | null = null;

  try {
    stock = await listStock({ lowOnly, q });
    moves = await listMoves({ limit: 25 });
    summary = await inventorySummary();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-16">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Inventory
            </h1>
            <p className="text-sm text-slate-600" dir="rtl">
              إدارة المخزون · استلام · تسوية · حد أدنى
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/pharmacy"
              className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
            >
              Pharmacy
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
            >
              Admin
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">SKUs · أصناف</div>
              <div className="text-2xl font-bold">{summary.skus}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Low · تحت الحد</div>
              <div
                className={`text-2xl font-bold ${
                  summary.low_count ? 'text-amber-600' : ''
                }`}
              >
                {summary.low_count}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Zero · نفد</div>
              <div className="text-2xl font-bold">{summary.zero_stock}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Units · وحدات</div>
              <div className="text-2xl font-bold">{summary.total_units}</div>
            </div>
          </div>
        )}

        <form
          method="get"
          className="rounded-2xl border bg-white p-3 shadow-sm flex flex-wrap gap-2 items-center"
        >
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="Search drug / SKU · بحث دواء"
            className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-4 py-2.5 text-base"
          />
          {lowOnly && <input type="hidden" name="low" value="1" />}
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Search
          </button>
          <Link
            href={lowOnly ? `/inventory${q ? `?q=${encodeURIComponent(q)}` : ''}` : `/inventory?low=1${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
              lowOnly
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {lowOnly ? 'Show all' : 'Low only'}
          </Link>
          <a
            href="/api/inventory?format=csv"
            className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            CSV export
          </a>
          <InventoryActions />
        </form>

        <ReceiveStockForm />

        <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3 font-semibold">SKU</th>
                <th className="p-3 font-semibold">Drug</th>
                <th className="p-3 font-semibold">On hand</th>
                <th className="p-3 font-semibold">Available</th>
                <th className="p-3 font-semibold">Min</th>
                <th className="p-3 font-semibold">Unit</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t ${s.is_low ? 'bg-amber-50' : ''}`}
                >
                  <td className="p-3 font-mono text-xs">{s.sku_code}</td>
                  <td className="p-3 font-medium">{s.drug_name}</td>
                  <td className="p-3">{s.qty_on_hand}</td>
                  <td className="p-3">{s.qty_available}</td>
                  <td className="p-3">{s.min_qty}</td>
                  <td className="p-3">{s.unit}</td>
                  <td className="p-3 text-xs">
                    {s.qty_on_hand <= 0 ? (
                      <span className="text-red-700 font-semibold">Empty</span>
                    ) : s.is_low ? (
                      <span className="text-amber-700 font-semibold">Low</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {stock.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="p-8 text-slate-500 text-center text-sm">
                    No SKUs — seed from prescriptions or receive stock below
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-semibold border-b bg-slate-50 text-sm">
            Movement log · دفتر الحركات
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3 font-semibold">Time</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Drug</th>
                <th className="p-3 font-semibold">Qty</th>
                <th className="p-3 font-semibold">After</th>
                <th className="p-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 text-xs whitespace-nowrap">
                    {String(m.created_at).slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="p-3 text-xs">{m.move_type}</td>
                  <td className="p-3">{m.drug_name}</td>
                  <td className="p-3">{m.qty}</td>
                  <td className="p-3">{m.balance_after}</td>
                  <td className="p-3 text-xs text-slate-500">{m.notes || '—'}</td>
                </tr>
              ))}
              {moves.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-sm">
                    No movements yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
