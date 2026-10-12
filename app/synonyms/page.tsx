import Link from 'next/link';
import {
  listBuiltinSynonyms,
  listSynonyms,
} from '@/lib/drugSynonyms';
import { SynonymForm } from './SynonymForm';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { FlowSteps } from '../FlowSteps';

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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Clinical tools · Synonyms
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ingredient synonyms
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                أسماء تجارية ← مواد فعّالة · للتفاعلات والحساسية
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link href="/ddinter" className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50">
                DDInter
              </Link>
              <Link href="/combinations" className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50">
                Combinations
              </Link>
            </div>
          </div>
        </header>

        <ClinicalDisclaimer
          extra="Synonym rows are operational maps only — verify the active substance on the product label before clinical decisions."
        />

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium text-sm">Add / update mapping</h2>
          <p className="text-xs text-slate-500">
            Example: alias <code className="bg-slate-100 px-1 rounded">Gliptus plus</code>{' '}
            → ingredient <code className="bg-slate-100 px-1 rounded">sitagliptin</code>
          </p>
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

        <ClinicalDisclaimer compact />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-3xl flex gap-2">
          <Link
            href="/ddinter"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← DDInter
          </Link>
          <Link
            href="/combinations"
            className="flex-1 rounded-xl bg-violet-700 py-3 text-center text-sm font-semibold text-white"
          >
            Combinations →
          </Link>
        </div>
      </div>
    </main>
  );
}
