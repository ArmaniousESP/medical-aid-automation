'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SyncProgramsButton } from './SyncProgramsButton';
import { UnlockPanel } from './UnlockPanel';
import { DashboardCards } from './DashboardCards';

type Row = {
  employee: string;
  patient?: string;
  requested: string;
  original?: string;
  newMed: string;
  availability: string;
  qty: number;
  unitPrice?: number | null;
  priceTotal?: number | string;
  priceSource?: string;
  score: number;
  isLowMatch: boolean;
  roshetta?: string;
  labs?: string;
  notes?: string;
};

function LinkList({ raw }: { raw?: string }) {
  if (!raw) return <span className="text-slate-400">—</span>;
  const links = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      {links.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs break-all"
        >
          {url.includes('drive.google.com') ? `Drive ${i + 1}` : url.substring(0, 36)}
        </a>
      ))}
    </div>
  );
}

function formatEGP(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 }) + ' EGP';
}

function PriceSourceBadge({ source }: { source?: string }) {
  if (!source || source === 'none') return null;
  const label =
    source === 'meddb3'
      ? 'MEDDB3'
      : source === 'dwaprices'
      ? 'DwaPrices'
      : source === 'egyptian-drug-db'
      ? 'Open DB'
      : source;
  const color =
    source === 'meddb3'
      ? 'bg-slate-100 text-slate-600'
      : source === 'dwaprices'
      ? 'bg-indigo-100 text-indigo-700'
      : 'bg-violet-100 text-violet-700';
  return (
    <span className={`ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'eva' | 'not-eva'>('all');

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
    if (filter === 'eva') return rows.filter((r) => r.availability === 'Available in EVA');
    if (filter === 'not-eva') return rows.filter((r) => r.availability !== 'Available in EVA');
    return rows;
  }, [rows, filter]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Medical Aid Automation
            </h1>
            <p className="mt-1 text-slate-600">
              طلب مساعدة علاج شهري — استمارة 9
            </p>
            <p className="mt-1 text-sm text-slate-500">
              PSP · Pharmacy · Safety triage · Refills
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <UnlockPanel />
            <Link href="/status" className="text-xs text-slate-500 hover:underline">
              System status
            </Link>
          </div>
        </header>

        <DashboardCards />

        <div className="flex flex-wrap gap-3 mb-8 items-start">
          <button
            onClick={() => run(true)}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Running…' : 'Dry Run'}
          </button>
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Processing…' : 'Process New Responses'}
          </button>
          <SyncProgramsButton />
          <Link
            href="/safety"
            className="px-5 py-2.5 rounded-lg bg-red-700 text-white hover:bg-red-800 font-medium transition"
          >
            Safety checklist
          </Link>
          <Link
            href="/ddinter"
            className="px-5 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium transition"
          >
            DDInter
          </Link>
          <Link
            href="/combinations"
            className="px-5 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-medium transition"
          >
            Combinations
          </Link>
          <Link
            href="/synonyms"
            className="px-5 py-2.5 rounded-lg border border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 font-medium transition"
          >
            Synonyms
          </Link>
          <Link
            href="/health-sync"
            className="px-5 py-2.5 rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 font-medium transition"
          >
            Health sync
          </Link>
          <Link
            href="/pms"
            className="px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium transition"
          >
            PMS
          </Link>
          <Link
            href="/psp"
            className="px-5 py-2.5 rounded-lg bg-pink-600 text-white hover:bg-pink-700 font-medium transition"
          >
            Patient journey
          </Link>
          <Link
            href="/care-line"
            className="px-5 py-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-medium transition"
          >
            Care Line
          </Link>
          <Link
            href="/notifications"
            className="px-5 py-2.5 rounded-lg bg-green-700 text-white hover:bg-green-800 font-medium transition"
          >
            WhatsApp
          </Link>
          <Link
            href="/eva-split"
            className="px-5 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-medium transition"
          >
            EVA split
          </Link>
          <Link
            href="/refills"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition"
          >
            Refills
          </Link>
          <Link
            href="/pharmacy"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition"
          >
            Pharmacy
          </Link>
          <Link
            href="/inventory"
            className="px-5 py-2.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium transition"
          >
            Inventory
          </Link>
          <Link
            href="/requests"
            className="px-5 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium transition"
          >
            Requests
          </Link>
          <Link
            href="/programs"
            className="px-5 py-2.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800 font-medium transition"
          >
            Programs
          </Link>
          <Link
            href="/reports"
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-medium transition"
          >
            Reports
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">Result</h2>
                {result.dryRun && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                    DRY RUN
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mb-4">{result.message}</p>
              {result.enroll && (
                <p className="text-sm text-indigo-700 mb-4">
                  Chronic enroll — created: {result.enroll.created}, updated:{' '}
                  {result.enroll.updated}, skipped: {result.enroll.skipped}
                  {result.enroll.errors?.length
                    ? ` (errors: ${result.enroll.errors.length})`
                    : ''}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <div className="text-2xl font-bold text-emerald-700">{result.newRows}</div>
                  <div className="text-xs text-slate-500">New rows</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-2xl font-bold">{result.skipped}</div>
                  <div className="text-xs text-slate-500">Skipped</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50">
                  <div className="text-2xl font-bold text-amber-700">{result.lowMatch}</div>
                  <div className="text-xs text-slate-500">Low match</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-700">
                    {result.totalEstimatedCost != null
                      ? formatEGP(result.totalEstimatedCost)
                      : '—'}
                  </div>
                  <div className="text-xs text-slate-500">Est. total cost</div>
                </div>
              </div>
            </div>

            {rows.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-slate-500 mr-1">Filter:</span>
                {([
                  ['all', 'All'],
                  ['low', 'Low match only'],
                  ['eva', 'Available in EVA'],
                  ['not-eva', 'NOT IN EVA'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      filter === key
                        ? 'bg-slate-800 text-white'
                        : 'bg-white border text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                    {key === 'low' && result.lowMatch > 0 && (
                      <span className="ml-1.5 text-xs opacity-80">({result.lowMatch})</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="py-3 px-3 font-medium">Employee / Patient</th>
                        <th className="py-3 px-3 font-medium">Requested → New</th>
                        <th className="py-3 px-3 font-medium">Status</th>
                        <th className="py-3 px-3 font-medium">Qty</th>
                        <th className="py-3 px-3 font-medium">Unit</th>
                        <th className="py-3 px-3 font-medium">Total</th>
                        <th className="py-3 px-3 font-medium">Score</th>
                        <th className="py-3 px-3 font-medium">Roshetta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-t ${
                            r.isLowMatch ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 align-top">
                            <div className="font-medium">{r.employee}</div>
                            {r.patient && (
                              <div className="text-xs text-slate-500 mt-0.5">{r.patient}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="text-slate-600">{r.requested}</div>
                            <div className="text-emerald-700 font-medium mt-0.5">
                              → {r.newMed}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                r.availability === 'Available in EVA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.availability === 'Available in EVA' ? 'EVA' : 'Not EVA'}
                            </span>
                            {r.isLowMatch && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Low
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top">{r.qty}</td>
                          <td className="py-3 px-3 align-top text-slate-600">
                            <span className="inline-flex items-center">
                              {formatEGP(r.unitPrice)}
                              <PriceSourceBadge source={r.priceSource} />
                            </span>
                          </td>
                          <td className="py-3 px-3 align-top font-medium">
                            {formatEGP(r.priceTotal)}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <span
                              className={
                                r.score >= 0.85
                                  ? 'text-emerald-600'
                                  : r.score >= 0.72
                                  ? 'text-slate-600'
                                  : 'text-amber-600 font-medium'
                              }
                            >
                              {(r.score * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 align-top max-w-[120px]">
                            <LinkList raw={r.roshetta} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 text-xs text-slate-400 border-t bg-slate-50 flex justify-between">
                  <span>
                    Showing {filtered.length} of {rows.length} rows
                  </span>
                  {result.totalEstimatedCost != null && (
                    <span className="font-medium text-slate-600">
                      Batch est. total: {formatEGP(result.totalEstimatedCost)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {rows.length === 0 && (
              <div className="p-8 text-center text-slate-500 rounded-xl bg-white border">
                No new rows to process.
              </div>
            )}
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-slate-400">
          Safety · DDInter · Combinations · Pharmacy · Refills · /status
        </footer>
      </div>
    </main>
  );
}
