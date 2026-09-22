import Link from 'next/link';
import { getRefillDetail } from '@/lib/refills';
import { getRefillSafetyReport } from '@/lib/refillSafety';
import { RefillActions } from './RefillActions';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';

export const dynamic = 'force-dynamic';

export default async function RefillDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let detail: Awaited<ReturnType<typeof getRefillDetail>> = null;
  let safety: Awaited<ReturnType<typeof getRefillSafetyReport>> = null;
  let error: string | null = null;

  try {
    detail = await getRefillDetail(params.id);
    if (detail) {
      safety = await getRefillSafetyReport(params.id);
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load';
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/refills">← Back</Link>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="p-6">
        <p>Not found</p>
        <Link href="/refills">← Back</Link>
      </main>
    );
  }

  const { cycle, items } = detail;
  const c = cycle as any;
  const itemList = items as any[];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/refills" className="text-blue-600 hover:underline">
            ← Refills
          </Link>
          <Link
            href={`/programs/${c.program_id}`}
            className="text-blue-600 hover:underline"
          >
            Program
          </Link>
          <Link href="/safety" className="text-blue-600 hover:underline">
            Safety checklist
          </Link>
        </div>

        <header className="rounded-lg border bg-white p-4 shadow-sm">
          <h1 className="text-xl font-semibold">{c.program_code}</h1>
          <p className="text-sm text-slate-600">
            {c.patient_name} ({c.relation}) · Employee: {c.employee_name} (
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
            Est: {c.estimated_total_egp ?? '—'} · Approved:{' '}
            {c.approved_total_egp ?? '—'}
          </p>
        </header>

        <ClinicalDisclaimer compact />

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Drug</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Total</th>
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
          safety={safety}
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
