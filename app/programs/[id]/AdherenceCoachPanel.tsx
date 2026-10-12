'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  priority: 'high' | 'medium' | 'low';
  dimension?: string;
  title_en: string;
  title_ar: string;
  action_en: string;
  action_ar: string;
};

const PRI: Record<string, string> = {
  high: 'bg-red-100 text-red-900',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-emerald-100 text-emerald-900',
};

export function AdherenceCoachPanel({
  programId,
  enabled,
}: {
  programId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loggingIdx, setLoggingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
        <p className="font-medium text-slate-800">AI adherence coach · مدرب الالتزام</p>
        <p className="text-xs">
          Disabled until management approval. Set{' '}
          <code className="text-[11px] bg-white px-1 rounded border">ENABLE_AI_ADHERENCE_COACH=true</code>{' '}
          in Vercel after approval.
        </p>
        <p className="text-xs" dir="rtl">
          موقوف حتى موافقة الإدارة على التشغيل.
        </p>
      </div>
    );
  }

  async function run() {
    setLoading(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch('/api/adherence-coach', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coach failed');
      if (!data.enabled) {
        setError('Coach flag is off');
        return;
      }
      setSummary(data.summary_en || data.summary_ar || null);
      setMode(data.mode || null);
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setDisclaimer(data.disclaimer || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function logToCareLine(s: Suggestion, idx: number) {
    setLoggingIdx(idx);
    setFlash(null);
    setError(null);
    try {
      const note = `[coach/${s.priority}] ${s.title_en}: ${s.action_en}`;
      const res = await fetch('/api/care-line', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          program_id: programId,
          channel: 'phone',
          outcome: 'other',
          notes: note,
          actor: 'adherence-coach',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Care-line log failed');
      setFlash('Logged to care-line · سُجّل في خط الرعاية');
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Log failed');
    } finally {
      setLoggingIdx(null);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">AI adherence coach</p>
          <p className="text-xs text-slate-500" dir="rtl">
            مدرب الالتزام · إرشادات للفريق
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Generate tips · إرشادات'}
        </button>
      </div>

      {error && (
        <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          {error}
        </p>
      )}
      {flash && (
        <p className="text-xs rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          {flash}
        </p>
      )}

      {summary && (
        <p className="text-xs text-slate-600">
          {summary}
          {mode ? ` · mode: ${mode}` : ''}
        </p>
      )}

      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="rounded-xl border bg-white p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${PRI[s.priority] || 'bg-slate-100'}`}
              >
                {s.priority}
              </span>
              <span className="font-medium text-slate-900">{s.title_en}</span>
              <span className="text-xs text-slate-500" dir="rtl">
                {s.title_ar}
              </span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap">{s.action_en}</p>
            {s.action_ar !== s.action_en && (
              <p className="text-xs text-slate-500" dir="rtl">
                {s.action_ar}
              </p>
            )}
            <button
              type="button"
              onClick={() => logToCareLine(s, i)}
              disabled={loggingIdx === i}
              className="text-[11px] font-semibold text-violet-700 hover:underline disabled:opacity-50"
            >
              {loggingIdx === i ? 'Saving…' : 'Log to care-line · سجّل في خط الرعاية'}
            </button>
          </li>
        ))}
      </ul>

      {disclaimer && (
        <p className="text-[10px] text-slate-400 leading-relaxed">{disclaimer}</p>
      )}
    </div>
  );
}
