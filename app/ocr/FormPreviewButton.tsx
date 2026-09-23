'use client';

import { useState } from 'react';

export function FormPreviewButton() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/ocr/form-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5, emptyMedsOnly: true }),
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

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-sm">Form attachment OCR preview</h2>
          <p className="text-xs text-slate-500">
            Latest form rows with roshetta links and empty med fields (no sheet write)
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={run}
          className="rounded bg-violet-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {loading ? 'Scanning…' : 'Preview last 5'}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {data?.previews?.length === 0 && (
        <p className="text-xs text-slate-500">No matching form rows.</p>
      )}
      {data?.previews?.map((p: any) => (
        <div key={p.rowIndex} className="border rounded p-2 text-xs space-y-1">
          <div className="font-medium">
            Row {p.rowIndex} · {p.empName} · {p.patient}
          </div>
          {p.error && <div className="text-red-700">{p.error}</div>}
          {p.form_fields && (
            <>
              <div>
                Meds: {p.form_fields.med_fields?.join(' · ') || '—'}
              </div>
              <div>
                Invoice val:{' '}
                <strong>
                  {p.form_fields.invoice_validation?.status || 'n/a'}
                </strong>
                {p.form_fields.invoice_total_egp != null &&
                  ` · ${p.form_fields.invoice_total_egp} EGP`}
              </div>
              {p.form_fields.needs_review && (
                <div className="text-amber-800">Needs review</div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
