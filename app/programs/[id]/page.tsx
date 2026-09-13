import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let program: any = null;
  let meds: any[] = [];
  let refills: any[] = [];
  let attachments: any[] = [];
  let error: string | null = null;

  try {
    const p = await query(
      `SELECT
         cp.*,
         e.external_employee_id,
         e.full_name AS employee_name,
         e.phone AS employee_phone,
         d.full_name AS patient_name,
         d.relation
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE cp.id = $1 OR cp.program_code = $1`,
      [params.id]
    );
    program = p.rows[0] || null;
    if (!program) {
      notFound();
    }

    const m = await query(
      `SELECT * FROM chronic_med_lines WHERE program_id = $1 ORDER BY line_code`,
      [program.id]
    );
    meds = m.rows;

    const r = await query(
      `SELECT id, period, status, estimated_total_egp, approved_total_egp, requested_at
       FROM refill_cycles WHERE program_id = $1 ORDER BY period DESC LIMIT 24`,
      [program.id]
    );
    refills = r.rows;

    const a = await query(
      `SELECT * FROM attachments WHERE entity_type = 'program' AND entity_id = $1`,
      [program.id]
    );
    attachments = a.rows;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/programs">← البرامج</Link>
      </main>
    );
  }

  if (!program) notFound();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/programs" className="text-sm text-blue-600 hover:underline">
          ← البرامج المزمنة
        </Link>

        <header className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <h1 className="text-xl font-semibold font-mono">
              {program.program_code}
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs h-fit">
              {program.status}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="font-medium">{program.patient_name}</span>
            <span className="text-slate-500"> ({program.relation})</span>
          </p>
          <p className="text-sm text-slate-600">
            موظف: {program.employee_name} · {program.external_employee_id}
            {program.employee_phone ? ` · ${program.employee_phone}` : ''}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {String(program.start_date).slice(0, 10)} →{' '}
            {program.end_date ? String(program.end_date).slice(0, 10) : '∞'}
          </p>
          {program.notes && (
            <p className="mt-2 text-sm text-slate-600">{program.notes}</p>
          )}
        </header>

        <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50">الأدوية</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">#</th>
                <th className="p-2">مطلوب</th>
                <th className="p-2">معتمد</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Formulary</th>
                <th className="p-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{m.line_code}</td>
                  <td className="p-2">{m.requested_name}</td>
                  <td className="p-2">{m.matched_name || '—'}</td>
                  <td className="p-2">{m.qty_per_cycle}</td>
                  <td className="p-2 text-xs">
                    {m.formulary_flag || '—'}
                    {m.company_preferred ? ' ★' : ''}
                  </td>
                  <td className="p-2 text-xs">{m.is_active ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {attachments.length > 0 && (
          <section className="rounded-lg border bg-white p-3 shadow-sm">
            <h2 className="font-medium mb-2">مرفقات</h2>
            <ul className="text-sm space-y-1">
              {attachments.map((a) => (
                <li key={a.id}>
                  <span className="text-slate-500 text-xs">{a.doc_type}: </span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {a.file_name || a.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50">دورات الصرف</h2>
          {refills.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">لا دورات بعد</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="p-2">Period</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Est.</th>
                  <th className="p-2">Approved</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {refills.map((rc) => (
                  <tr key={rc.id} className="border-t">
                    <td className="p-2">{rc.period}</td>
                    <td className="p-2 text-xs">{rc.status}</td>
                    <td className="p-2">{rc.estimated_total_egp ?? '—'}</td>
                    <td className="p-2">{rc.approved_total_egp ?? '—'}</td>
                    <td className="p-2">
                      <Link
                        href={`/refills/${rc.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
