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

export function OcrForm() {
  const [imageUrl, setImageUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullText, setFullText] = useState('');
  const [provider, setProvider] = useState('');
  const [lines, setLines] = useState<Line[]>([]);

  async function run(mode: 'url' | 'text') {
    setLoading(true);
    setError(null);
    setLines([]);
    setFullText('');
    try {
      const body =
        mode === 'text'
          ? { text }
          : { imageUrl: imageUrl.trim() };
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && !data.lines) {
        throw new Error(data.error || 'OCR failed');
      }
      if (data.error && !data.ok) {
        setError(data.error);
      }
      setProvider(data.provider || '');
      setFullText(data.full_text || '');
      setLines(Array.isArray(data.lines) ? data.lines : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <label className="block text-xs text-slate-500">
          Roshetta image URL (Drive share or direct)
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
          onClick={() => run('url')}
          className="rounded bg-indigo-600 px-4 py-2 text-white text-xs disabled:opacity-50"
        >
          {loading ? 'Running OCR…' : 'OCR from URL'}
        </button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <label className="block text-xs text-slate-500">
          Or paste text (manual / external OCR)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded border px-3 py-2 text-sm font-mono"
          placeholder={'1 Crestor 20 mg once daily\nGlucophage 500 × 2'}
        />
        <button
          type="button"
          disabled={loading || text.trim().length < 3}
          onClick={() => run('text')}
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

      {provider && (
        <p className="text-xs text-slate-500">
          Provider: <strong>{provider}</strong>
        </p>
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
