'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = [
  ['prescription', 'روشتة'],
  ['lab', 'تحاليل'],
  ['imaging', 'أشعة'],
  ['id_card', 'كارنيه'],
  ['relation_proof', 'إثبات قرابة'],
  ['invoice', 'فاتورة'],
  ['rejection_letter', 'خطاب رفض'],
  ['other', 'أخرى'],
] as const;

export function RegisterDocForm() {
  const [programId, setProgramId] = useState('');
  const [url, setUrl] = useState('');
  const [docType, setDocType] = useState('prescription');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          program_id: programId.trim(),
          url: url.trim(),
          doc_type: docType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg(data.created ? 'تم التسجيل' : 'موجود مسبقاً');
      setUrl('');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border bg-white p-4 shadow-sm flex flex-wrap gap-3 items-end text-sm"
    >
      <div>
        <label className="block text-xs text-slate-500 mb-1">Program UUID</label>
        <input
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          required
          className="rounded border px-2 py-1.5 min-w-[220px] font-mono text-xs"
          placeholder="من صفحة البرامج"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">النوع</label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded border px-2 py-1.5"
        >
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-slate-500 mb-1">رابط Drive / ملف</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          type="url"
          className="rounded border px-2 py-1.5 w-full"
          placeholder="https://drive.google.com/..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-600 px-4 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? '…' : 'تسجيل مستند'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </form>
  );
}
