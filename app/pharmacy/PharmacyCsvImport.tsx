'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const TEMPLATE_URL = '/templates/pharmacy-import-template.csv';

export function PharmacyCsvImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    setErrors([]);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('markItemDispensed', 'true');
      const res = await fetch('/api/pharmacy/import-csv', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setMsg(
        `Imported ${data.updated ?? 0} of ${data.rows_read ?? 0} rows` +
          (data.skipped ? ` · skipped ${data.skipped}` : '') +
          (data.cycles_touched?.length
            ? ` · ${data.cycles_touched.length} cycle(s)`
            : '')
      );
      if (Array.isArray(data.details)) {
        const fails = data.details
          .filter((d: { ok: boolean }) => !d.ok)
          .slice(0, 8)
          .map(
            (d: { line_code: string; message?: string }) =>
              `${d.line_code}: ${d.message || 'failed'}`
          );
        setErrors(fails);
      }
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-indigo-950">
          Import pharmacy CSV · استيراد ملف الصيدلية
        </p>
        <p className="text-xs text-indigo-800/80 mt-1">
          Use the same columns as the export. Fill <strong>dispensed_qty</strong>{' '}
          (or qty), then upload. Match is by <code className="text-[10px]">line_code</code> +{' '}
          <code className="text-[10px]">period</code>.
        </p>
        <p className="text-xs text-indigo-800/80 mt-0.5" dir="rtl">
          نفس أعمدة التصدير — عبّئ dispensed_qty ثم ارفع الملف
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={TEMPLATE_URL}
          download="pharmacy-import-template.csv"
          className="rounded-xl border-2 border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-100"
        >
          Download template · قالب CSV
        </a>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
        >
          {loading ? 'Importing…' : 'Upload CSV · رفع الملف'}
        </button>
      </div>
      {msg && (
        <p className="text-xs font-medium text-indigo-950" dir="auto">
          {msg}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="text-[11px] text-red-800 space-y-0.5 list-disc list-inside">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
