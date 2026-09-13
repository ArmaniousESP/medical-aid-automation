import Link from 'next/link';
import { getRefillDetail } from '@/lib/refills';
import { RefillActions } from './RefillActions';

export const dynamic = 'force-dynamic';

export default async function RefillDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let detail: Awaited<ReturnType<typeof getRefillDetail>> = null;
  let error: string | null = null;

  try {
    detail = await getRefillDetail(params.id);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/refills">← العودة</Link>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="p-6">
        <p>غير موجود</p>
        <Link href="/refills">← العودة</Link>
      </main>
    );
  }

  const { cycle, items } = detail;
  const c = cycle as any;
  const itemList = items as any[];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/refills" className="text-sm text-blue-600 hover:underline">
          ← قائمة الدورات
        </Link>

        <header className="rounded-lg border bg-white p-4 shadow-sm">
          <h1 className="text-xl font-semibold">{c.program_code}</h1>
          <p className="text-sm text-slate-600">
            {c.patient_name} ({c.relation}) · موظف: {c.employee_name} (
            {c.external_employee_id})
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{c.period}</span> ·{' '}
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {c.status}
            </span>
            {c.external_claim_id && (
              <span className="ml-2 font-mono text-xs text-slate-500">
                {c.external_claim_id}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            تقديري: {c.estimated_total_egp ?? '—'} · معتمد:{' '}
            {c.approved_total_egp ?? '—'}
          </p>
        </header>

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">الدواء</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">سعر</th>
                <th className="p-2 text-left">إجمالي</th>
                <th className="p-2 text-left">Formulary</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {itemList.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{it.line_code}</td>
                  <td className="p-2">{it.drug_name}</td>
                  <td className="p-2">{it.qty}</td>
                  <td className="p-2">{it.unit_price_egp ?? '—'}</td>
                  <td className="p-2">{it.line_total_egp ?? '—'}</td>
                  <td className="p-2 text-xs">
                    {it.formulary_flag ?? '—'}
                    {it.company_preferred ? ' ★' : ''}
                  </td>
                  <td className="p-2 text-xs">{it.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <RefillActions
          cycleId={c.id}
          cycleStatus={c.status}
          items={itemList.map((it) => ({
            id: it.id,
            status: it.status,
            drug_name: it.drug_name,
          }))}
        />
      </div>
    </main>
  );
}
