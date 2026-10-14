import Link from 'next/link';
import { scanRefillSafetyQueue } from '@/lib/refillSafety';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { SafetyWhatsAppButton } from './SafetyWhatsAppButton';
import { FlowSteps } from '../../FlowSteps';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function RefillSafetyQueuePage() {
  let report: Awaited<ReturnType<typeof scanRefillSafetyQueue>> | null = null;
  let error: string | null = null;

  try {
    report = await scanRefillSafetyQueue({ limit: 40 });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="aid-section-label">Clinical tools · Safety queue</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Refill safety queue
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                دورات بعلم أحمر · تفاعلات أو حساسية عالية قبل الاعتماد
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/refills"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                ← Refills
              </Link>
              <Link
                href="/safety"
                className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 font-medium hover:bg-white backdrop-blur"
              >
                Checklist
              </Link>
              <Link href="/pharmacy" className="aid-cta-teal px-3 py-2 text-sm">
                Pharmacy →
              </Link>
            </div>
          </div>
        </header>

        <ClinicalDisclaimer />

        <SafetyWhatsAppButton />

        {error && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="aid-kpi">
                <div className="text-xs text-slate-500">Cycles scanned</div>
                <div className="text-3xl font-bold">{report.scanned}</div>
              </div>
              <div className="aid-kpi">
                <div className="text-xs text-slate-500">With high flags</div>
                <div className="text-3xl font-bold text-red-700">{report.flagged}</div>
              </div>
            </div>

            {report.rows.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-2xl border border-white/80 bg-white/90 p-6 text-center backdrop-blur">
                No high-priority safety flags in the scanned set.
              </p>
            ) : (
              <div className="rounded-2xl border border-white/80 bg-white/90 shadow-sm overflow-hidden backdrop-blur">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b bg-slate-50/80">
                      <th className="p-3">Program</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Flags</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.cycle_id} className="border-t">
                        <td className="p-3 font-mono text-xs">{r.program_code}</td>
                        <td className="p-3 text-xs">
                          {r.patient_name}
                          <div className="text-slate-400">{r.employee_name}</div>
                        </td>
                        <td className="p-3 text-xs">{r.period}</td>
                        <td className="p-3 text-xs">{r.status}</td>
                        <td className="p-3 text-xs text-red-800 font-medium">
                          {r.summary}
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/refills/${r.cycle_id}`}
                            className="inline-block rounded-lg bg-violet-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-800"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-slate-400">
          GET /api/refills/safety-queue · POST /api/notifications/safety-alert
        </p>
      </div>

      <div className="aid-sticky-bar">
        <div className="mx-auto max-w-4xl flex gap-2">
          <Link
            href="/safety"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Checklist
          </Link>
          <Link href="/pharmacy" className="aid-cta-teal flex-1 py-3 text-center text-sm">
            Pharmacy →
          </Link>
        </div>
      </div>
    </main>
  );
}
