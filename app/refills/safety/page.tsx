import Link from 'next/link';
import { scanRefillSafetyQueue } from '@/lib/refillSafety';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { SafetyWhatsAppButton } from './SafetyWhatsAppButton';

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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Refill safety queue</h1>
            <p className="text-sm text-slate-600">
              Cycles with DDInter Major or allergy High — review before approve/dispense
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/notifications" className="text-blue-600 hover:underline">
              WhatsApp
            </Link>
            <Link href="/refills" className="text-blue-600 hover:underline">
              All refills
            </Link>
            <Link href="/safety" className="text-blue-600 hover:underline">
              Safety checklist
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <ClinicalDisclaimer />

        <SafetyWhatsAppButton />

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">Cycles scanned</div>
                <div className="text-3xl font-bold">{report.scanned}</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">With high flags</div>
                <div className="text-3xl font-bold text-red-700">{report.flagged}</div>
              </div>
            </div>

            {report.rows.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border bg-white p-6 text-center">
                No high-priority safety flags in the scanned set.
              </p>
            ) : (
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                      <th className="p-2">Program</th>
                      <th className="p-2">Patient</th>
                      <th className="p-2">Period</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Flags</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.cycle_id} className="border-t">
                        <td className="p-2 font-mono text-xs">{r.program_code}</td>
                        <td className="p-2 text-xs">
                          {r.patient_name}
                          <div className="text-slate-400">{r.employee_name}</div>
                        </td>
                        <td className="p-2 text-xs">{r.period}</td>
                        <td className="p-2 text-xs">{r.status}</td>
                        <td className="p-2 text-xs text-red-800 font-medium">
                          {r.summary}
                        </td>
                        <td className="p-2">
                          <Link
                            href={`/refills/${r.cycle_id}`}
                            className="text-blue-600 text-xs hover:underline"
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
    </main>
  );
}
