import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReleaseLetterPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const res = await query(
    `SELECT rl.*, cp.program_code,
            e.full_name AS employee_name,
            e.external_employee_id AS employee_id,
            d.full_name AS patient_name,
            d.relation
     FROM release_letters rl
     JOIN chronic_programs cp ON cp.id = rl.program_id
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE rl.id = $1 OR rl.letter_code = $1`,
    [params.id]
  ).catch(() => ({ rows: [] as any[] }));

  const letter = res.rows[0];
  if (!letter) notFound();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="no-print flex flex-wrap gap-3 text-sm">
            <Link href={`/programs/${letter.program_id}`} className="text-blue-600 hover:underline">
              ← Program
            </Link>
            <button
              type="button"
              className="rounded bg-slate-800 px-3 py-1 text-white text-xs"
              // @ts-expect-error server component — use client print via onClick won't work; use link
            >
              Use browser Print (Ctrl+P)
            </button>
          </div>

          <article className="rounded-lg border bg-white p-8 shadow-sm print:shadow-none print:border-0">
            <header className="border-b pb-4 mb-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Medical Aid Program · Pharmacy Release
              </p>
              <h1 className="text-xl font-semibold mt-1">{letter.letter_code}</h1>
              <p className="text-sm text-slate-600 mt-1">
                Period {letter.period} · Issued{' '}
                {String(letter.issued_at).slice(0, 10)}
              </p>
            </header>

            <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div>
                <dt className="text-xs text-slate-500">Program</dt>
                <dd className="font-mono">{letter.program_code}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd>{letter.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Employee</dt>
                <dd>
                  {letter.employee_name}
                  <span className="text-slate-500 text-xs block">{letter.employee_id}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Patient</dt>
                <dd>
                  {letter.patient_name}
                  <span className="text-slate-500 text-xs block">{letter.relation}</span>
                </dd>
              </div>
            </dl>

            {letter.pharmacy_note && (
              <p className="text-sm mb-4 rounded bg-amber-50 border border-amber-100 p-3">
                <span className="font-medium">Pharmacy note: </span>
                {letter.pharmacy_note}
              </p>
            )}

            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed border-t pt-4">
              {letter.body}
            </pre>

            <footer className="mt-10 pt-6 border-t text-xs text-slate-500 flex justify-between">
              <span>Authorized for monthly chronic supply</span>
              <span>Print date: {new Date().toISOString().slice(0, 10)}</span>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
}
