import Link from 'next/link';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    title: '1. Import DDInter data',
    href: '/ddinter',
    body: 'Load at least ATC file B (or all files). Without pairs, interaction severity stays empty.',
  },
  {
    title: '2. Map Egypt brands → ingredients',
    href: '/synonyms',
    body: 'Seed builtin synonyms, then add missing trade names (Gliptus, Empixera, …).',
  },
  {
    title: '3. Document patient allergies',
    href: '/programs',
    body: 'On each program, add allergen + severity. High hits appear as Allergy risk badge.',
  },
  {
    title: '4. Review combinations before pharmacy batch',
    href: '/combinations',
    body: 'See common co-prescriptions, DDInter levels, and regimens with Major hits.',
  },
  {
    title: '5. Escalate Major / High only — do not auto-block',
    href: '/pharmacy',
    body: 'Route alerts to pharmacist. Tools are triage, not a dispense lock.',
  },
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Safety checklist</h1>
            <p className="text-sm text-slate-600">
              Monthly ops flow for interactions & allergies
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Home
          </Link>
        </header>

        <ClinicalDisclaimer />

        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li
              key={s.title}
              className="rounded-xl border bg-white p-4 shadow-sm space-y-1"
            >
              <Link
                href={s.href}
                className="font-medium text-sm text-blue-700 hover:underline"
              >
                {s.title}
              </Link>
              <p className="text-xs text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="rounded-xl border bg-white p-4 shadow-sm text-xs text-slate-600 space-y-2">
          <h2 className="font-medium text-sm text-slate-900">Quick API examples</h2>
          <pre className="bg-slate-50 border rounded p-2 overflow-x-auto text-[11px]">{`GET  /api/ddinter/check?drugs=Warfarin,Aspirin
GET  /api/allergies?program_id=UUID
GET  /api/synonyms?resolve=Gliptus%20plus
GET  /api/ddinter/scan?limit=25`}</pre>
          <p>
            Full guide in repo:{' '}
            <code className="bg-slate-100 px-1 rounded">docs/clinical-tools-usage.md</code>
          </p>
        </section>

        <ClinicalDisclaimer compact />
      </div>
    </main>
  );
}
