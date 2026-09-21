'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CHANNELS = [
  ['phone', 'هاتف'],
  ['sms', 'SMS'],
  ['whatsapp', 'واتساب'],
  ['email', 'بريد'],
  ['in_person', 'حضوري'],
] as const;

const OUTCOMES = [
  ['reached', 'تم الوصول'],
  ['voicemail', 'رسالة صوتية'],
  ['no_answer', 'لا إجابة'],
  ['scheduled_refill', 'تم ترتيب الصرف'],
  ['education_done', 'تثقيف'],
  ['escalated', 'تصعيد'],
  ['other', 'أخرى'],
] as const;

const DROPOUTS = [
  ['cost', 'تكلفة'],
  ['access_system', 'منظومة'],
  ['condition_improved', 'تحسّن'],
  ['side_effects', 'آثار جانبية'],
  ['complex_regimen', 'تعقيد علاج'],
  ['forgot_disengaged', 'نسيان/انقطاع'],
  ['beliefs', 'معتقدات'],
  ['moved_transferred', 'نقل/تأمين'],
  ['deceased', 'وفاة'],
  ['other', 'أخرى'],
] as const;

export function CareLinePanel({ programId }: { programId: string }) {
  const [channel, setChannel] = useState('phone');
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes] = useState('');
  const [dropout, setDropout] = useState('cost');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function logContact(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/care-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          program_id: programId,
          channel,
          outcome,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg('تم تسجيل الاتصال');
      setNotes('');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  async function doDropout() {
    if (!confirm('تأكيد تسجيل انقطاع المريض عن البرنامج؟')) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/care-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dropout',
          program_id: programId,
          reason_code: dropout,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setMsg('تم تسجيل الانقطاع');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <form onSubmit={logContact} className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">القناة</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {CHANNELS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">النتيجة</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {OUTCOMES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 mb-1">ملاحظات</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded border px-2 py-1.5 w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
        >
          تسجيل اتصال
        </button>
      </form>

      <div className="flex flex-wrap gap-2 items-end border-t pt-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            سبب الانقطاع (WHO)
          </label>
          <select
            value={dropout}
            onChange={(e) => setDropout(e.target.value)}
            className="rounded border px-2 py-1.5"
          >
            {DROPOUTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={doDropout}
          disabled={loading}
          className="rounded bg-red-600 px-3 py-1.5 text-white disabled:opacity-50"
        >
          تسجيل انقطاع
        </button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
