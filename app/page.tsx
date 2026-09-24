'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SyncProgramsButton } from './SyncProgramsButton';
import { UnlockPanel } from './UnlockPanel';
import { DashboardCards } from './DashboardCards';
import { ProcessIntakeButton } from './ProcessIntakeButton';

type Row = {
  employee: string;
  patient?: string;
  requested: string;
  newMed: string;
  availability: string;
  qty: number;
  unitPrice?: number | null;
  priceTotal?: number | string;
  priceSource?: string;
  score: number;
  isLowMatch: boolean;
  roshetta?: string;
};

function formatEGP(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 }) + ' EGP';
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'eva' | 'not-eva'>('all');
  const [showLegacy, setShowLegacy] = useState(false);

  async function run(dryRun: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const rows: Row[] = result?.rows || result?.samples || [];
  const filtered = useMemo(() => {
    if (filter === 'low') return rows.filter((r) => r.isLowMatch);
    if (filter === 'eva')
      return rows.filter((r) => r.availability === 'Available in EVA');
    if (filter === 'not-eva')
      return rows.filter((r) => r.availability !== 'Available in EVA');
    return rows;
  }, [rows, filter]);

  return (
    <main className="min-h-screen text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medical Aid</h1>
            <p className="mt-1 text-slate-600">
              Monthly treatment support — intake to pharmacy on one platform
            </p>
            <p className="mt-1 text-sm text-slate-500" dir="rtl">
              دعم العلاج الشهري · من التقديم حتى الصرف
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <UnlockPanel />
            <Link
              href="/guide"
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              How to use →
            </Link>
          </div>
        </header>

        {/* Step strip */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-semibold text-slate-800">Do this in order</h2>
            <Link href="/guide" className="text-xs text-violet-700 hover:underline">
              Full guide
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                n: '1',
                t: 'Submit',
                d: 'Beneficiary form',
                href: '/intake',
                color: 'bg-emerald-600',
              },
              {
                n: '2',
                t: 'Review queue',
                d: 'New requests',
                href: '/intake-ops',
                color: 'bg-violet-600',
              },
              {
                n: '3',
                t: 'Process',
                d: 'Match + enroll',
                href: '/intake-ops',
                color: 'bg-indigo-600',
              },
              {
                n: '4',
                t: 'Claims',
                d: 'Amounts',
                href: '/claims',
                color: 'bg-slate-700',
              },
              {
                n: '5',
                t: 'Dispense',
                d: 'Programs / pharmacy',
                href: '/pharmacy',
                color: 'bg-teal-600',
              },
            ].map((s) => (
              <Link
                key={s.n}
                href={s.href}
                className="rounded-lg border p-3 hover:border-violet-300 hover:shadow-sm transition group"
              >
                <div
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold ${s.color}`}
                >
                  {s.n}
                </div>
                <div className="mt-2 font-medium group-hover:text-violet-800">
                  {s.t}
                </div>
                <div className="text-xs text-slate-500">{s.d}</div>
              </Link>
            ))}
          </div>
        </div>

        <DashboardCards />

        {/* Primary actions */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
          <h2 className="font-semibold text-violet-900">Platform processing</h2>
          <p className="text-sm text-violet-800">
            Processes requests submitted on this website (Neon). Prefer this over the Google sheet path.
          </p>
          <ProcessIntakeButton />
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/intake"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Submit request
            </Link>
            <Link
              href="/intake-ops"
              className="rounded-lg bg-white border border-violet-300 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              Intake queue
            </Link>
            <Link
              href="/claims"
              className="rounded-lg bg-white border border-violet-300 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              Claims
            </Link>
            <Link
              href="/programs"
              className="rounded-lg bg-white border border-violet-300 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              Programs
            </Link>
          </div>
        </div>

        {/* Advanced tools — collapsed by default pattern */}
        <details className="rounded-xl border bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
            More tools (OCR, safety, EVA, reports…)
          </summary>
          <div className="px-5 pb-5 flex flex-wrap gap-2 border-t pt-3">
            {[
              ['/ocr', 'OCR'],
              ['/review', 'Review queue'],
              ['/eva-split', 'EVA split'],
              ['/safety', 'Safety'],
              ['/refills', 'Refills'],
              ['/inventory', 'Inventory'],
              ['/requests', 'Request status'],
              ['/reports', 'Reports'],
              ['/psp', 'Patient journey'],
              ['/care-line', 'Care line'],
              ['/notifications', 'WhatsApp'],
              ['/ddinter', 'DDInter'],
              ['/status', 'System status'],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </details>

        {/* Legacy sheet */}
        <details
          className="rounded-xl border border-dashed border-slate-300 bg-white"
          open={showLegacy}
          onToggle={(e) => setShowLegacy((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer px-5 py-3 text-sm text-slate-500">
            Legacy: Google sheet process (optional)
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t pt-3">
            <p className="text-xs text-slate-500">
              Only if you still collect via Google Form. New work should use platform intake.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => run(true)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-medium disabled:opacity-50"
              >
                {loading ? '…' : 'Sheet dry run'}
              </button>
              <button
                onClick={() => run(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
              >
                {loading ? '…' : 'Process sheet'}
              </button>
              <SyncProgramsButton />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {error}
              </div>
            )}
            {result && (
              <div className="p-4 rounded-lg bg-slate-50 text-sm space-y-2">
                <p>{result.message}</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span>New: {result.newRows}</span>
                  <span>Skipped: {result.skipped}</span>
                  <span>Low match: {result.lowMatch}</span>
                  {result.totalEstimatedCost != null && (
                    <span>Est: {formatEGP(result.totalEstimatedCost)}</span>
                  )}
                </div>
                {rows.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(['all', 'low', 'eva', 'not-eva'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className={`px-2 py-1 rounded text-xs ${
                          filter === key
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                )}
                {filtered.length > 0 && (
                  <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                    {filtered.slice(0, 20).map((r, i) => (
                      <li key={i}>
                        {r.employee}: {r.requested} → {r.newMed} ({r.qty})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </details>

        <footer className="text-center text-xs text-slate-400 pb-8">
          <Link href="/guide" className="text-violet-600 hover:underline">
            How to use the platform
          </Link>
          {' · '}
          Top nav: Submit · Intake queue · Claims · Programs · Pharmacy
        </footer>
      </div>
    </main>
  );
}
