'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Medical Aid Automation
          </h1>
          <p className="mt-2 text-slate-600">
            طلب مساعدة علاج شهري — استمارة 9
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Processes new form responses → expands medications → matches EVA
            catalog → parses quantity → carries attachment links.
          </p>
        </header>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => run(true)}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-medium disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Dry Run'}
          </button>
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Processing…' : 'Process New Responses'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white border shadow-sm">
              <h2 className="font-semibold text-lg mb-3">Result</h2>
              <p className="text-slate-700">{result.message}</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <div className="text-2xl font-bold text-emerald-700">
                    {result.newRows}
                  </div>
                  <div className="text-xs text-slate-500">New rows</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-2xl font-bold">{result.skipped}</div>
                  <div className="text-xs text-slate-500">Skipped</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50">
                  <div className="text-2xl font-bold text-amber-700">
                    {result.lowMatch}
                  </div>
                  <div className="text-xs text-slate-500">Low match</div>
                </div>
              </div>
            </div>

            {result.samples?.length > 0 && (
              <div className="p-5 rounded-xl bg-white border shadow-sm overflow-x-auto">
                <h2 className="font-semibold text-lg mb-3">Sample rows</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2 pr-3">Employee</th>
                      <th className="py-2 pr-3">Requested</th>
                      <th className="py-2 pr-3">→ New Med</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.samples.map((s: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3">{s.employee}</td>
                        <td className="py-2 pr-3">{s.requested}</td>
                        <td className="py-2 pr-3">{s.newMed}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={
                              s.availability === 'Available in EVA'
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }
                          >
                            {s.availability}
                          </span>
                        </td>
                        <td className="py-2">{s.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-slate-400">
          Version-controlled on GitHub · Deployed on Vercel
        </footer>
      </div>
    </main>
  );
}
