'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SynonymForm() {
  const [alias, setAlias] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, ingredient }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Saved: ${data.alias_norm} → ${data.ingredient_norm}`);
      setAlias('');
      setIngredient('');
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function seed() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_builtin: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Seeded ${data.seeded} builtin synonyms into DB`);
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function resolve() {
    if (!alias.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/synonyms?resolve=${encodeURIComponent(alias)}`
      );
      const data = await res.json();
      setMsg(
        data.resolved_ingredient
          ? `${data.original} → ${data.resolved_ingredient} · tokens: ${data.tokens?.slice(0, 6).join(', ')}`
          : `No synonym for "${alias}" · tokens: ${data.tokens?.slice(0, 6).join(', ')}`
      );
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <form onSubmit={save} className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Alias / brand</span>
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Gliptus plus"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Ingredient</span>
          <input
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="sitagliptin"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-600 px-3 py-1.5 text-white text-xs disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={resolve}
          className="rounded border px-3 py-1.5 text-xs"
        >
          Test resolve
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={seed}
          className="rounded bg-slate-700 px-3 py-1.5 text-white text-xs disabled:opacity-50"
        >
          Seed builtin → DB
        </button>
      </form>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
