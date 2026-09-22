import Link from 'next/link';
import { listHealthSyncRuns } from '@/lib/healthSync';
import { HealthSyncButton } from './HealthSyncButton';

export const dynamic = 'force-dynamic';

export default async function HealthSyncPage() {
  let runs: any[] = [];
  let error: string | null = null;

  try {
    runs = await listHealthSyncRuns(20);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load runs';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Health data sync</h1>
            <p className="text-sm text-slate-600">
              Form → Approved sheet → Neon programs (automated)
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/status" className="text-blue-600 hover:underline">
              Status
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Run now</h2>
          <p className="text-xs text-slate-500">
            1) Process new form responses · 2) Sync Approved-Requests into chronic
            programs. Needs GOOGLE_* + DATABASE_URL on Vercel.
          </p>
          <HealthSyncButton />
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-2 text-sm">
          <h2 className="font-medium">Schedule</h2>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>
              Vercel Cron: <code>/api/cron/health-sync</code> every 6 hours
            </li>
            <li>
              Also: <code>/api/cron/daily</code> 06:00 UTC ·{' '}
              <code>/api/cron/sync-sheet</code> every 6h
            </li>
            <li>GitHub Action: Sync Sheet → Database (optional)</li>
          </ul>
        </section>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            {error}
          </div>
        )}

        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
            Recent runs
          </h2>
          {runs.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No runs logged yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs">
                  <th className="p-2">When</th>
                  <th className="p-2">Trigger</th>
                  <th className="p-2">OK</th>
                  <th className="p-2">ms</th>
                  <th className="p-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const sync = r.sync_json as {
                    created?: number;
                    updated?: number;
                    skipped?: number;
                    groups?: number;
                  } | null;
                  const proc = r.process_json as {
                    newRows?: number;
                    skipped?: number;
                  } | null;
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 font-mono text-xs">
                        {String(r.started_at).slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="p-2 text-xs">{r.trigger}</td>
                      <td className="p-2">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            r.ok
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.ok ? (r.partial ? 'partial' : 'ok') : 'fail'}
                        </span>
                      </td>
                      <td className="p-2 text-xs">{r.duration_ms ?? '—'}</td>
                      <td className="p-2 text-xs text-slate-600">
                        {proc
                          ? `process +${proc.newRows ?? 0} / skip ${proc.skipped ?? 0}`
                          : ''}
                        {proc && sync ? ' · ' : ''}
                        {sync
                          ? `programs c${sync.created ?? 0} u${sync.updated ?? 0} s${sync.skipped ?? 0} (${sync.groups ?? 0} groups)`
                          : ''}
                        {r.error && (
                          <span className="block text-red-600 mt-0.5">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
