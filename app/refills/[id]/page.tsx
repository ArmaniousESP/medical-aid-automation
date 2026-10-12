import Link from 'next/link';
import { getRefillDetail } from '@/lib/refills';
import { getRefillSafetyReport } from '@/lib/refillSafety';
import { RefillActions } from './RefillActions';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { FlowSteps } from '../../FlowSteps';
import { isWhoAssessmentEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

const RISK_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-900',
  critical: 'bg-red-100 text-red-800',
};

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
  const whoOn = isWhoAssessmentEnabled();
  const risk = c.latest_risk as string | null | undefined;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <FlowSteps current={5} />
        <div className="flex flex-wrap gap-3 text-sm items-center justify-between">
          <Link href="/refills" className="font-medium text-violet-700 hover:underline">
            ← Refills
          </Link>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <Link
              href={`/programs/${c.program_id}`}
              className="hover:text-violet-700 hover:underline"
            >
              Program
            </Link>
            <Link href="/pharmacy" className="hover:text-violet-700 hover:underline">
              Pharmacy
            </Link>
            <Link href="/safety" className="hover:underline">
              Safety
            </Link>
          </div>
        </div>

        <header className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
          <div className="flex flex-wrap justify-between gap-2">
            <h1 className="text-xl font-semibold font-mono">{c.program_code}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                {c.status}
              </span>
              {whoOn && risk && (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    RISK_COLOR[risk] || 'bg-slate-100'
                  }`}
                >
                  Risk: {risk}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600">
            {c.patient_name} ({c.relation}) · Employee: {c.employee_name} (
            {c.external_employee_id})
          </p>
          <p className="text-sm">
            <span className="font-medium">{c.period}</span>
            {c.external_claim_id && (
              <span className="ml-2 font-mono text-xs text-slate-500">
                {c.external_claim_id}
              </span>
            )}
          </p>
          <p className="text-sm text-slate-600">
            Est: {c.estimated_total_egp ?? '—'} · Approved:{' '}
            {c.approved_total_egp ?? '—'}
          </p>
        </header>

        <ClinicalDisclaimer compact />

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
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

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-4xl flex gap-2">
          <Link
            href="/refills"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← List
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
