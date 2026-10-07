'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';
import { INVENTORY_MODE_OPTIONS } from '@/lib/optionLists';

async function loadMedOptions(q: string): Promise<PickerOption[]> {
  const res = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search_med', q, limit: 8 }),
  });
  const data = await res.json();
  return ((data.items || []) as { name_en?: string; name_ar?: string }[]).map((it) => {
    const name = it.name_en || it.name_ar || '';
    return {
      value: name,
      label: name,
      sublabel: it.name_ar && it.name_en ? it.name_ar : undefined,
    };
  });
}

export function ReceiveStockForm() {
  const [drug, setDrug] = useState('');
  const [qty, setQty] = useState('10');
  const [mode, setMode] = useState<'receive' | 'adjust' | 'write_off'>('receive');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const medLoader = useCallback((q: string) => loadMedOptions(q), []);

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
      <div className="min-w-[180px]">
        <label className="block text-xs text-slate-500 mb-1">العملية</label>
        <SearchablePicker
          value={mode}
          onChange={(v) => {
            if (v === 'receive' || v === 'adjust' || v === 'write_off') setMode(v);
          }}
          options={INVENTORY_MODE_OPTIONS}
          allowCreate={false}
          placeholder="Mode…"
        />
      </div>
      <div className="min-w-[220px] flex-1">
        <label className="block text-xs text-slate-500 mb-1">اسم الدواء</label>
        <SearchablePicker
          value={drug}
          onChange={setDrug}
          loadOptions={medLoader}
          learnKey="medicine"
          allowCreate
          minQueryLength={2}
          required
          placeholder="Search formulary or add…"
          createLabel={(q) => `Use “${q}” · استخدام`}
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
          className="rounded-xl border border-slate-200 px-3 py-3 w-28 text-base"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700 disabled:opacity-50 font-semibold"
      >
        {loading ? '…' : 'تنفيذ'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </form>
  );
}
