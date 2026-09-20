'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InventoryActions() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function seed() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_formulary' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg(`بذر: +${data.created} جديد / ${data.existing} موجود`);
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={seed}
        disabled={loading}
        className="rounded bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? '…' : 'بذر من الوصفات'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}
