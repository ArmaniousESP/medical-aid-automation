import Link from 'next/link';
import { ddinterStats } from '@/lib/ddinter';
import { DdinterImportButton } from './DdinterImportButton';
import { DdinterCheckForm } from './DdinterCheckForm';

export const dynamic = 'force-dynamic';

export default async function DdinterPage() {
  let stats = { pairs: 0, major: 0, source_files: 0 };
  let error: string | null = null;
  try {
    stats = await ddinterStats();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'DB error';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">DDInter 2.0</h1>
            <p className="text-sm text-slate-600">
              Drug–drug interaction pairs imported locally ·{' '}
              <a
                href="https://ddinter2.scbdd.com"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                ddinter2.scbdd.com
              </a>{' '}
              (CC BY-NC-SA 4.0)
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/combinations" className="text-blue-600 hover:underline">
              Combinations
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Pairs loaded</div>
            <div className="text-2xl font-bold">{stats.pairs.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Major</div>
            <div className="text-2xl font-bold text-red-700">
              {stats.major.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Source files</div>
            <div className="text-2xl font-bold">{stats.source_files}</div>
          </div>
        </div>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Import from DDInter</h2>
          <p className="text-xs text-slate-500">
            Downloads official CSV files (ATC A/B/D/H/L/P/R/V) into Neon. Run once
            (or when DDInter updates). Non-commercial license.
          </p>
          <DdinterImportButton />
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Check a list of drugs</h2>
          <DdinterCheckForm />
        </section>

        <p className="text-xs text-slate-400">
          API: POST /api/ddinter/import · GET /api/ddinter/check?drugs=Warfarin,Aspirin
          · GET /api/ddinter/check?program_id=… · Ops triage only — not clinical CDS.
        </p>
      </div>
    </main>
  );
}
