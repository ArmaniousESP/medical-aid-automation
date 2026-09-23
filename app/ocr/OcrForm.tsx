'use client';

import { useState } from 'react';

type Line = {
  raw: string;
  clean_name: string;
  qty: number;
  frequency_hint: string | null;
  matched_name: string | null;
  match_score: number;
  formulary_hint: string | null;
};

type InvoiceInfo = {
  total_egp: number | null;
  pharmacy_hint: string | null;
  date_hint: string | null;
};

export function OcrForm() {
  const [imageUrl, setImageUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [text, setText] = useState('');
  const [docKind, setDocKind] = useState<'auto' | 'prescription' | 'invoice'>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullText, setFullText] = useState('');
  const [provider, setProvider] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [kind, setKind] = useState('');
  const [via, setVia] = useState('');

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setLines([]);
    setFullText('');
    setInvoice(null);
    setKind('');
    setVia('');
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, docKind }),
      });
      const data = await res.json();

      if (data.results && Array.isArray(data.results)) {
        // Batch
        const ok = data.results.filter((r: { ok: boolean }) => r.ok);
        const first = ok[0] || data.results[0];
        setProvider(`batch ${data.ok_count}/${data.results.length}`);
        setFullText(
          data.results
            .map(
              (r: { source_url?: string; full_text?: string; error?: string }, i: number) =>
                `--- file ${i + 1} ${r.source_url || ''}\n${r.full_text || r.error || ''}`
            )
            .join('\n\n')
        );
        const allLines = data.results.flatMap((r: { lines?: Line[] }) => r.lines || []);
        setLines(allLines);
        const inv = data.results.find((r: { invoice?: InvoiceInfo }) => r.invoice)?.invoice;
        if (inv) setInvoice(inv);
        if (!data.ok_count) setError(first?.error || 'All OCR attempts failed');
        return;
      }

      if (!res.ok && !data.lines) {
        throw new Error(data.error || 'OCR failed');
      }
      if (data.error && !data.ok) setError(data.error);
      setProvider(data.provider || '');
      setFullText(data.full_text || '');
      setLines(Array.isArray(data.lines) ? data.lines : []);
      setKind(data.doc_kind || '');
      setVia(data.download_via || '');
      if (data.invoice) setInvoice(data.invoice);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError('Max 12MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        setError('Could not read file');
        return;
      }
      post({ imageBase64: m[2], mime: m[1] });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500">Document type:</span>
        {(['auto', 'prescription', 'invoice'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setDocKind(k)}
            className={`rounded-full px-3 py-1 text-xs border ${
              docKind === k
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white'
            }`}
          >
            {k === 'auto' ? 'Auto' : k === 'prescription' ? 'Roshetta' : 'Invoice'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-slate-500">
          Upload photo (phone camera / scan)
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
          className="block w-full text-xs"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-slate-500">
          Or Drive / image URL
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="https://drive.google.com/file/d/…/view"
        />
        <button
          type="button"
          disabled={loading || !imageUrl.trim()}
          onClick={() => post({ imageUrl: imageUrl.trim() })}
          className="rounded bg-indigo-600 px-4 py-2 text-white text-xs disabled:opacity-50"
        >
          {loading ? 'Running OCR…' : 'OCR from URL'}
        </button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="block text-xs text-slate-500">
          Batch URLs (one per line — roshetta + invoices from form)
        </label>
        <textarea
          value={batchUrls}
          onChange={(e) => setBatchUrls(e.target.value)}
          rows={3}
          className="w-full rounded border px-3 py-2 text-xs font-mono"
          placeholder={'https://drive.google.com/.../roshetta\nhttps://drive.google.com/.../invoice'}
        />
        <button
          type="button"
          disabled={loading || !batchUrls.trim()}
          onClick={() =>
            post({
              urls: batchUrls
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="rounded bg-violet-700 px-4 py-2 text-white text-xs disabled:opacity-50"
        >
          OCR batch
        </button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <label className="block text-xs text-slate-500">
          Or paste text (manual / external OCR)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded border px-3 py-2 text-sm font-mono"
          placeholder={'1 Crestor 20 mg once daily\nGlucophage 500 × 2'}
        />
        <button
          type="button"
          disabled={loading || text.trim().length < 3}
          onClick={() => post({ text })}
          className="rounded bg-slate-800 px-4 py-2 text-white text-xs disabled:opacity-50"
        >
          Parse text
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      {(provider || kind || via) && (
        <p className="text-xs text-slate-500">
          {provider && (
            <>
              Provider: <strong>{provider}</strong>{' '}
            </>
          )}
          {kind && (
            <>
              · Kind: <strong>{kind}</strong>{' '}
            </>
          )}
          {via && (
            <>
              · Download: <strong>{via}</strong>
            </>
          )}
        </p>
      )}

      {invoice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-1">
          <div className="font-medium text-emerald-900">Invoice parse</div>
          <div>
            Total:{' '}
            <strong>
              {invoice.total_egp != null
                ? `${invoice.total_egp.toLocaleString('en-EG')} EGP`
                : '—'}
            </strong>
          </div>
          {invoice.pharmacy_hint && <div>Pharmacy: {invoice.pharmacy_hint}</div>}
          {invoice.date_hint && <div>Date: {invoice.date_hint}</div>}
        </div>
      )}

      {fullText && (
        <div>
          <h3 className="text-xs font-medium text-slate-500 mb-1">Raw text</h3>
          <pre className="text-xs bg-slate-50 border rounded p-3 max-h-40 overflow-auto whitespace-pre-wrap">
            {fullText}
          </pre>
        </div>
      )}

      {lines.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 bg-slate-50">
                <th className="p-2">Raw</th>
                <th className="p-2">Clean</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Freq</th>
                <th className="p-2">Match</th>
                <th className="p-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-xs max-w-[140px] truncate" title={l.raw}>
                    {l.raw}
                  </td>
                  <td className="p-2 text-xs">{l.clean_name}</td>
                  <td className="p-2">{l.qty}</td>
                  <td className="p-2 text-xs">{l.frequency_hint || '—'}</td>
                  <td className="p-2 text-xs text-emerald-800">
                    {l.matched_name || '—'}
                    {l.formulary_hint ? (
                      <span className="text-slate-400"> · {l.formulary_hint}</span>
                    ) : null}
                  </td>
                  <td className="p-2 text-xs">
                    {l.match_score
                      ? `${Math.round(l.match_score * 100)}%`
                      : '—'}
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
