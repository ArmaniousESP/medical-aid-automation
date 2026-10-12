'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';

const CHANNEL_OPTIONS: PickerOption[] = [
  { value: 'phone', label: 'Phone · هاتف' },
  { value: 'whatsapp', label: 'WhatsApp · واتساب' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email · بريد' },
  { value: 'in_person', label: 'In person · حضوري' },
];

const OUTCOME_OPTIONS: PickerOption[] = [
  { value: 'reached', label: 'Reached · تم الوصول' },
  { value: 'voicemail', label: 'Voicemail · رسالة صوتية' },
  { value: 'no_answer', label: 'No answer · لا إجابة' },
  { value: 'scheduled_refill', label: 'Scheduled refill · تم ترتيب الصرف' },
  { value: 'education_done', label: 'Education · تثقيف' },
  { value: 'escalated', label: 'Escalated · تصعيد' },
  { value: 'other', label: 'Other · أخرى' },
];

const DROPOUT_OPTIONS: PickerOption[] = [
  { value: 'cost', label: 'Cost · تكلفة' },
  { value: 'access_system', label: 'Access / system · منظومة' },
  { value: 'condition_improved', label: 'Condition improved · تحسّن' },
  { value: 'side_effects', label: 'Side effects · آثار جانبية' },
  { value: 'complex_regimen', label: 'Complex regimen · تعقيد علاج' },
  { value: 'forgot_disengaged', label: 'Forgot / disengaged · نسيان/انقطاع' },
  { value: 'beliefs', label: 'Beliefs · معتقدات' },
  { value: 'moved_transferred', label: 'Moved / transferred · نقل/تأمين' },
  { value: 'deceased', label: 'Deceased · وفاة' },
  { value: 'other', label: 'Other · أخرى' },
];

export function CareLinePanel({ programId }: { programId: string }) {
  const [channel, setChannel] = useState('phone');
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes] = useState('');
  const [sendWa, setSendWa] = useState(false);
  const [dropout, setDropout] = useState('cost');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const channelOpts = useMemo(() => CHANNEL_OPTIONS, []);
  const outcomeOpts = useMemo(() => OUTCOME_OPTIONS, []);
  const dropoutOpts = useMemo(() => DROPOUT_OPTIONS, []);

  async function logContact(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/care-line', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          program_id: programId,
          channel,
          outcome,
          notes: notes || undefined,
          send_whatsapp: sendWa,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      let t = 'تم تسجيل الاتصال';
      if (data.whatsapp) {
        t += data.whatsapp.ok
          ? data.whatsapp.dry_run
            ? ' · واتساب (تجريبي)'
            : ' · واتساب أُرسل'
          : ` · واتساب: ${data.whatsapp.error || 'فشل'}`;
      }
      setMsg(t);
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
        credentials: 'include',
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
      <form onSubmit={logContact} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Channel · القناة
            </label>
            <SearchablePicker
              value={channel}
              onChange={setChannel}
              options={channelOpts}
              allowCreate={false}
              learnKey="careline_channel"
              placeholder="Channel…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Outcome · النتيجة
            </label>
            <SearchablePicker
              value={outcome}
              onChange={setOutcome}
              options={outcomeOpts}
              allowCreate={false}
              learnKey="careline_outcome"
              placeholder="Outcome…"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Notes · ملاحظات
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base"
            placeholder="Optional note…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={sendWa}
              onChange={(e) => setSendWa(e.target.checked)}
              className="rounded border-slate-300"
            />
            Also send WhatsApp · إرسال واتساب أيضاً
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {loading ? '…' : 'Log contact · تسجيل اتصال'}
          </button>
        </div>
      </form>

      <div className="border-t pt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dropout reason (WHO) · سبب الانقطاع
          </label>
          <SearchablePicker
            value={dropout}
            onChange={setDropout}
            options={dropoutOpts}
            allowCreate={false}
            learnKey="careline_dropout"
            placeholder="Reason…"
          />
        </div>
        <button
          type="button"
          onClick={doDropout}
          disabled={loading}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Record dropout · تسجيل انقطاع
        </button>
      </div>

      {msg && (
        <p className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
          {msg}
        </p>
      )}
    </div>
  );
}
