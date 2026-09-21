'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function ReleaseLetterButton({ programId }: { programId: string }) {
  const [loading, setLoading] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const router = useRouter();

  async function issue() {
    setLoading(true);
    setText(null);
    setLetterId(null);
    try {
      const res = await fetch('/api/psp/release-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setText(data.body || data.letter_code);
      setCode(data.letter_code || null);
      setLetterId(data.id || null);
      router.refresh();
    } catch (e: unknown) {
      setText(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={issue}
          disabled={loading}
          className="rounded bg-slate-800 px-3 py-1.5 text-white text-xs disabled:opacity-50"
        >
          {loading ? 'Issuing…' : 'Issue pharmacy release letter'}
        </button>
        {letterId && (
          <Link
            href={`/release-letters/${letterId}`}
            className="rounded border px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
            target="_blank"
          >
            Open printable {code || ''}
          </Link>
        )}
      </div>
      {text && !letterId && (
        <pre className="text-xs bg-slate-50 border rounded p-2 whitespace-pre-wrap overflow-x-auto">
          {text}
        </pre>
      )}
      {text && letterId && (
        <p className="text-xs text-slate-500">Letter created — use Printable link (Ctrl+P).</p>
      )}
    </div>
  );
}
