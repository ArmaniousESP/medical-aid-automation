'use client';

import { useMemo, useState } from 'react';

type Row = {
  employee: string;
  patient?: string;
  requested: string;
  original?: string;
  newMed: string;
  availability: string;
  qty: number;
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
          {url.includes('drive.google.com') ? `Drive link ${i + 1}` : url.substring(0, 40)}
        </a>
      ))}
    </div>
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
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Medical Aid Automation
          </h1>
          <p className="mt-1 text-slate-600">
            طلب مساعدة علاج شهري — استمارة 9
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Expand medications · Match EVA catalog · Parse quantity · Carry attachments
          </p>
        </header>

        <div className="flex flex-wrap gap-3 mb-8">
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
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Summary cards */}
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
              <div className="grid grid-cols-3 gap-4 text-center">
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
              </div>
            </div>

            {/* Filters */}
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

            {/* Rows table */}
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
                        <th className="py-3 px-3 font-medium">Score</th>
                        <th className="py-3 px-3 font-medium">روشتة</th>
                        <th className="py-3 px-3 font-medium">فحوصات</th>
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
                            {r.isLowMatch && r.original && r.original !== r.requested && (
                              <div className="text-xs text-amber-700 mt-1">
                                original: {r.original}
                              </div>
                            )}
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
                          <td className="py-3 px-3 align-top max-w-[140px]">
                            <LinkList raw={r.roshetta} />
                          </td>
                          <td className="py-3 px-3 align-top max-w-[140px]">
                            <LinkList raw={r.labs} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 text-xs text-slate-400 border-t bg-slate-50">
                  Showing {filtered.length} of {rows.length} rows
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
          GitHub Actions · Vercel · Google Sheets
        </footer>
      </div>
    </main>
  );
}
