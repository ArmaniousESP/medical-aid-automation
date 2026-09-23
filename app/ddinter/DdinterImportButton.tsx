'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FileResult = {
  code: string;
  inserted: number;
  skipped?: number;
  error?: string;
  fetch_attempts?: number;
};

export function DdinterImportButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [files, setFiles] = useState<FileResult[] | null>(null);
  const router = useRouter();

  async function run(codes?: string[]) {
    setLoading(true);
    setMsg(null);
    setFiles(null);
    try {
      const res = await fetch('/api/ddinter/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codes ? { codes } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const list: FileResult[] = data.files || [];
      setFiles(list);
      const okFiles = list.filter((f) => !f.error).length;
      const failed = list.filter((f) => f.error).length;
      setMsg(
        `Inserted ${data.total_inserted} · DB pairs ${data.stats?.pairs ?? '—'} · ` +
          `${okFiles} file(s) ok` +
          (failed ? ` · ${failed} failed` : '') +
          ` · HTTP retries on 408/429/5xx only`
      );
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => run(['B'])}
          className="rounded bg-slate-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          Import B only (blood — smaller)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => run()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Import all ATC files'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Each CSV download retries up to WEBHOOK_RETRY_ATTEMPTS (default 3) on network
        errors, 408, 429, or 5xx. Parse/insert is not retried. Files run sequentially.
      </p>
      {msg && <p className="text-xs text-slate-700">{msg}</p>}
      {files && files.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-2">ATC</th>
                <th className="p-2">Inserted</th>
                <th className="p-2">Skipped</th>
                <th className="p-2">HTTP tries</th>
                <th className="p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.code} className="border-t">
                  <td className="p-2 font-mono font-medium">{f.code}</td>
                  <td className="p-2">{f.inserted}</td>
                  <td className="p-2">{f.skipped ?? '—'}</td>
                  <td className="p-2 tabular-nums">{f.fetch_attempts ?? '—'}</td>
                  <td className="p-2 text-red-700 max-w-[200px] break-all">
                    {f.error || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
