import Link from 'next/link';
import { ddinterStats } from '@/lib/ddinter';
import { webhookRetryDefaults } from '@/lib/httpRetry';
import { DdinterImportButton } from './DdinterImportButton';
import { DdinterCheckForm } from './DdinterCheckForm';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';

export const dynamic = 'force-dynamic';

export default async function DdinterPage() {
  let stats = { pairs: 0, major: 0, source_files: 0 };
  let error: string | null = null;
  try {
    stats = await ddinterStats();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'DB error';
  }

  const retry = webhookRetryDefaults();

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
            <Link href="/synonyms" className="text-blue-600 hover:underline">
              Synonyms
            </Link>
            <Link href="/combinations" className="text-blue-600 hover:underline">
              Combinations
            </Link>
            <Link href="/refills/safety" className="text-blue-600 hover:underline">
              Safety queue
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <ClinicalDisclaimer />

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
            Downloads official CSV files (ATC A/B/D/H/L/P/R/V) into Neon. HTTP download
            uses shared retry ({retry.maxAttempts} attempts, base {retry.baseDelayMs}ms).
            Only the download is retried — not CSV parse/insert. Non-commercial license.
          </p>
          <DdinterImportButton />
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Check a list of drugs</h2>
          <p className="text-xs text-slate-500">
            Example: <code className="bg-slate-100 px-1 rounded">Warfarin, Aspirin, Ibuprofen</code>
            {' '}or Egyptian brands after synonyms (e.g. Brufen → ibuprofen).
          </p>
          <DdinterCheckForm />
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-2 text-xs text-slate-600">
          <h2 className="font-medium text-sm text-slate-900">Usage examples (API)</h2>
          <pre className="bg-slate-50 border rounded p-2 overflow-x-auto text-[11px] leading-relaxed">{`# Status
GET /api/ddinter/import

# Import ATC B only (download retried on 5xx/429)
POST /api/ddinter/import  {"codes":["B"]}

# Check names
GET /api/ddinter/check?drugs=Warfarin,Aspirin

# Check a program regimen
GET /api/ddinter/check?program_id=UUID`}</pre>
          <p>
            Full guide:{' '}
            <code className="bg-slate-100 px-1 rounded">docs/clinical-tools-usage.md</code>
          </p>
        </section>

        <ClinicalDisclaimer compact />
      </div>
    </main>
  );
}
