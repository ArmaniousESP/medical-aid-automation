'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProgramStatusActions({
  programId,
  status,
}: {
  programId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setStatus(next: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, actor: 'ui' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {status === 'active' ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus('suspended')}
          className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Suspend · إيقاف مؤقت
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus('active')}
          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Activate · تفعيل
        </button>
      )}
      {status !== 'cancelled' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (confirm('Cancel this program permanently?')) setStatus('cancelled');
          }}
          className="rounded-xl bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          Cancel · إلغاء البرنامج
        </button>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

export function MedLineToggle({
  programId,
  lineId,
  isActive,
}: {
  programId: string;
  lineId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/programs/${programId}/meds/${lineId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      router.refresh();
    } catch {
      // ignore — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`text-xs font-medium underline disabled:opacity-50 ${
        isActive ? 'text-amber-700' : 'text-emerald-700'
      }`}
    >
      {loading ? '…' : isActive ? 'Pause line · إيقاف البند' : 'Activate line · تفعيل البند'}
    </button>
  );
}
