'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReceiveStockForm() {
  const [drug, setDrug] = useState('');
  const [qty, setQty] = useState('10');
  const [mode, setMode] = useState<'receive' | 'adjust' | 'write_off'>('receive');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        action: mode,
        drug_name: drug,
        actor: 'inventory-ui',
      };
      if (mode === 'adjust') {
        body.signed_qty = Number(qty);
        body.notes = 'تسوية مخزون';
      } else if (mode === 'write_off') {
        body.qty = Math.abs(Number(qty));
        body.notes = 'إهلاك / تلف';
      } else {
        body.qty = Math.abs(Number(qty));
        body.notes = 'استلام مخزون';
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg(`تم — الرصيد الآن ${data.balance_after}`);
      setDrug('');
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
        <label className="block text-xs text-slate-500 mb-1">العملية</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="rounded border px-2 py-1.5"
        >
          <option value="receive">استلام (+)</option>
          <option value="adjust">تسوية (+/−)</option>
          <option value="write_off">إهلاك (−)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">اسم الدواء</label>
        <input
          value={drug}
          onChange={(e) => setDrug(e.target.value)}
          required
          className="rounded border px-2 py-1.5 min-w-[200px]"
          placeholder="مثلاً Blokatens 5/160"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          {mode === 'adjust' ? 'الكمية (+ أو −)' : 'الكمية'}
        </label>
        <input
          type="number"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
          className="rounded border px-2 py-1.5 w-28"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-600 px-4 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? '…' : 'تنفيذ'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </form>
  );
}
