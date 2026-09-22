import Link from 'next/link';
import {
  listBuiltinSynonyms,
  listSynonyms,
} from '@/lib/drugSynonyms';
import { SynonymForm } from './SynonymForm';

export const dynamic = 'force-dynamic';

export default async function SynonymsPage() {
  const builtin = listBuiltinSynonyms();
  let db: any[] = [];
  try {
    db = await listSynonyms(200);
  } catch {
    db = [];
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Ingredient synonyms</h1>
            <p className="text-sm text-slate-600">
              Trade / Egypt brands → generic names for DDInter matching
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/ddinter" className="text-blue-600 hover:underline">
              DDInter
            </Link>
            <Link href="/combinations" className="text-blue-600 hover:underline">
              Combinations
            </Link>
          </div>
        </header>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Add / update mapping</h2>
          <SynonymForm />
        </section>

        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
            Database overrides ({db.length})
          </h2>
          {db.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">
              None yet — use form or Seed builtin.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="p-2">Alias</th>
                  <th className="p-2">Ingredient</th>
                  <th className="p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {db.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono text-xs">
                      {r.alias_display || r.alias_norm}
                    </td>
                    <td className="p-2 text-xs">
                      {r.ingredient_display || r.ingredient_norm}
                    </td>
                    <td className="p-2 text-xs text-slate-500">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <h2 className="p-3 font-medium border-b bg-slate-50 text-sm">
            Built-in map ({builtin.length})
          </h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {builtin.map((r) => (
                  <tr key={r.alias} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.alias}</td>
                    <td className="p-2 text-xs text-emerald-800">{r.ingredient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
