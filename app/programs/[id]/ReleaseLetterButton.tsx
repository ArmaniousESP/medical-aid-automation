'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReleaseLetterButton({ programId }: { programId: string }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const router = useRouter();

  async function issue() {
    setLoading(true);
    setText(null);
    try {
      const res = await fetch('/api/psp/release-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setText(data.body || data.letter_code);
      router.refresh();
    } catch (e: unknown) {
      setText(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <button
        type="button"
        onClick={issue}
        disabled={loading}
        className="rounded bg-slate-800 px-3 py-1.5 text-white text-xs disabled:opacity-50"
      >
        {loading ? 'Issuing…' : 'Issue pharmacy release letter'}
      </button>
      {text && (
        <pre className="text-xs bg-slate-50 border rounded p-2 whitespace-pre-wrap overflow-x-auto">
          {text}
        </pre>
      )}
    </div>
  );
}
