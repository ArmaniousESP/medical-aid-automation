import Link from 'next/link';
import { listFormulary, formularyCount } from '@/lib/formularySync';
import { FlowSteps } from '../FlowSteps';
import { FormularySyncButton } from './SyncButton';

export const dynamic = 'force-dynamic';

export default async function FormularyPage({
  searchParams,
}: {
  searchParams: { q?: string; eva?: string };
}) {
  const q = (searchParams.q || '').trim();
  const evaOnly = searchParams.eva === '1';
  let rows: Awaited<ReturnType<typeof listFormulary>> = [];
  let total = 0;
  let error: string | null = null;

  try {
    total = await formularyCount();
    rows = await listFormulary({ q, evaOnly, limit: 150 });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load formulary';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={1} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-violet-600 font-medium">
                More tools · Formulary
              </p>
              <h1 className="text-2xl font-semibold">Medicine formulary</h1>
              <p className="text-sm text-slate-600">
                Matching catalog · {total} rows · used when you Process intake
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/intake-ops"
                className="rounded-lg bg-violet-700 text-white px-3 py-1.5 hover:bg-violet-800"
              >
                ← Queue
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                Pharmacy
              </Link>
              <Link
                href="/eva-split"
                className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                EVA split
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-4 text-sm space-y-3">
          <p className="font-medium text-violet-900">How to use</p>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-violet-900 space-y-1">
            <li>
              Click <strong>Sync from programs</strong> so names match what is
              already enrolled
            </li>
            <li>Search or filter <strong>EVA only</strong> when checking preferred products</li>
            <li>
              Return to <strong>Queue</strong> and run Process platform intake
            </li>
          </ol>
          <p className="text-xs text-violet-800" dir="rtl">
            مزامنة من البرامج ← بحث / إيفا ← عودة للطابور والمعالجة
          </p>
          <FormularySyncButton />
        </div>

        <form className="flex flex-wrap gap-2 items-center" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name…"
            className="rounded border px-3 py-2 text-sm min-w-[200px] flex-1"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="eva" value="1" defaultChecked={evaOnly} />
            EVA only
          </label>
          <button
            type="submit"
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
            <p className="text-xs mt-1">
              Unlock on Home if needed ·{' '}
              <Link href="/status" className="underline">
                status
              </Link>
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <p className="text-sm text-slate-500">
            No rows. Run <strong>Sync from programs</strong> above, or process
            intake first so programs exist.
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">AR</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">EVA</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-xs text-slate-600" dir="rtl">
                      {r.name_ar || '—'}
                    </td>
                    <td className="p-3">{r.price ?? '—'}</td>
                    <td className="p-3">
                      {r.eva ? (
                        <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs">
                          {r.eva}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500">{r.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
