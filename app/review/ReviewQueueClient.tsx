'use client';

import { useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export function ReviewQueueClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bandFilter, setBandFilter] = useState<'all' | 'review' | 'manual'>('all');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ocr/form-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10, emptyMedsOnly: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const previews = (data?.previews || []).filter((p: any) => {
    if (p.error) return true;
    const band = p.form_fields?.confidence_detail?.band;
    const needs = p.form_fields?.needs_review;
    if (!needs && band === 'auto') return false;
    if (bandFilter === 'all') return true;
    return band === bandFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={loading}
          onClick={load}
          className="rounded bg-amber-700 px-4 py-2 text-xs text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Scan form attachments'}
        </button>
        {(['all', 'review', 'manual'] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBandFilter(b)}
            className={`rounded-full px-3 py-1 text-xs border ${
              bandFilter === b ? 'bg-slate-800 text-white' : 'bg-white'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      {!data && !loading && (
        <p className="text-sm text-slate-500">
          Click scan to OCR recent form rows and list those needing review.
        </p>
      )}

      {data && previews.length === 0 && (
        <p className="text-sm text-slate-500">No items in this filter.</p>
      )}

      {previews.map((p: any) => (
        <div
          key={p.rowIndex}
          className="rounded-xl border bg-white p-4 shadow-sm text-sm space-y-2"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-medium">
                Row {p.rowIndex} · {p.empName}
              </div>
              <div className="text-xs text-slate-500">{p.patient}</div>
            </div>
            {p.form_fields?.confidence_detail && (
              <ConfidenceBadge detail={p.form_fields.confidence_detail} compact />
            )}
          </div>
          {p.error && <p className="text-xs text-red-700">{p.error}</p>}
          {p.form_fields && (
            <>
              <p className="text-xs font-mono">
                {p.form_fields.med_fields?.join(' · ') || '— no meds parsed'}
              </p>
              <p className="text-xs text-slate-600">
                Invoice: {p.form_fields.invoice_validation?.status || 'n/a'}
                {p.form_fields.invoice_total_egp != null &&
                  ` · ${p.form_fields.invoice_total_egp} EGP`}
              </p>
              {p.urls?.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.urls.map((u: string, i: number) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
