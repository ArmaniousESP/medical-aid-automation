'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReceiveStockForm() {
  const [drug, setDrug] = useState('');
  const [qty, setQty] = useState('10');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          move_type: 'receive',
          drug_name: drug,
          qty: Number(qty),
          actor: 'inventory-ui',
          notes: 'استلام مخزون',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg(`تم الاستلام — الرصيد الآن ${data.balance_after}`);
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
        <label className="block text-xs text-slate-500 mb-1">كمية الاستلام</label>
        <input
          type="number"
          min={0.001}
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
          className="rounded border px-2 py-1.5 w-24"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-600 px-4 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? '…' : 'استلام مخزون'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </form>
  );
}
