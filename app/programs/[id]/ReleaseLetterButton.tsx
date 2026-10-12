'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function ReleaseLetterButton({ programId }: { programId: string }) {
  const [loading, setLoading] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  async function issue() {
    setLoading(true);
    setText(null);
    setLetterId(null);
    setOk(false);
    try {
      const res = await fetch('/api/psp/release-letter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setText(data.body || data.letter_code || 'Created');
      setCode(data.letter_code || null);
      setLetterId(data.id || null);
      setOk(true);
      router.refresh();
    } catch (e: unknown) {
      setText(e instanceof Error ? e.message : 'Error');
      setOk(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-slate-500 leading-relaxed">
        Issue a pharmacy release letter for this program. Print or share the
        letter code with the dispensing pharmacy.
      </p>
      <p className="text-xs text-slate-500" dir="rtl">
        إصدار خطاب صرف للصيدلية — اطبع أو شارك كود الخطاب مع الصيدلية.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={issue}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading
            ? 'Issuing… · جاري الإصدار…'
            : 'Issue letter · إصدار خطاب'}
        </button>
        {letterId && (
          <Link
            href={`/release-letters/${letterId}`}
            className="rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100"
            target="_blank"
            rel="noreferrer"
          >
            Print {code || 'letter'} · طباعة
          </Link>
        )}
      </div>

      {text && !ok && (
        <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          {text}
        </p>
      )}
      {ok && letterId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 space-y-1">
          <p className="font-semibold">Letter ready · الخطاب جاهز</p>
          {code && (
            <p className="font-mono text-sm tracking-wide">{code}</p>
          )}
          <p className="text-emerald-800/80">
            Open the printable link, then use Ctrl/Cmd+P.
          </p>
        </div>
      )}
      {ok && !letterId && text && (
        <pre className="text-xs bg-slate-50 border rounded-xl p-3 whitespace-pre-wrap overflow-x-auto">
          {text}
        </pre>
      )}
    </div>
  );
}
