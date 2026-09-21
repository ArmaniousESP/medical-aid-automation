import Link from 'next/link';
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProgramStatusActions, MedLineToggle } from './ProgramActions';
import { DOC_TYPE_LABELS_AR } from '@/lib/documents';
import { PnatForm } from './PnatForm';
import { CareLinePanel } from './CareLinePanel';
import { PfetForm } from './PfetForm';
import { ReleaseLetterButton } from './ReleaseLetterButton';
import { AdverseEventForm } from './AdverseEventForm';
import { JOURNEY_LABELS_AR, ELIGIBILITY_LABELS_AR } from '@/lib/psp';

export const dynamic = 'force-dynamic';

const RISK_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-900',
  critical: 'bg-red-100 text-red-800',
};

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let program: any = null;
  let meds: any[] = [];
  let refills: any[] = [];
  let attachments: any[] = [];
  let assessments: any[] = [];
  let contacts: any[] = [];
  let plans: any[] = [];
  let adverse: any[] = [];
  let error: string | null = null;

  try {
    const p = await query(
      `SELECT cp.*, e.external_employee_id, e.full_name AS employee_name,
              e.phone AS employee_phone, d.full_name AS patient_name, d.relation
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE cp.id = $1 OR cp.program_code = $1`,
      [params.id]
    );
    program = p.rows[0] || null;
    if (!program) notFound();

    meds = (
      await query(`SELECT * FROM chronic_med_lines WHERE program_id = $1 ORDER BY line_code`, [
        program.id,
      ])
    ).rows;
    refills = (
      await query(
        `SELECT id, period, status, estimated_total_egp, approved_total_egp, requested_at
         FROM refill_cycles WHERE program_id = $1 ORDER BY period DESC LIMIT 24`,
        [program.id]
      )
    ).rows;
    attachments = (
      await query(
        `SELECT * FROM attachments WHERE entity_type = 'program' AND entity_id = $1 ORDER BY created_at DESC`,
        [program.id]
      )
    ).rows;

    try {
      assessments = (
        await query(
          `SELECT * FROM adherence_assessments WHERE program_id = $1 ORDER BY assessed_at DESC LIMIT 10`,
          [program.id]
        )
      ).rows;
    } catch {
      assessments = [];
    }
    try {
      contacts = (
        await query(
          `SELECT * FROM care_line_contacts WHERE program_id = $1 ORDER BY contacted_at DESC LIMIT 15`,
          [program.id]
        )
      ).rows;
    } catch {
      contacts = [];
    }
    try {
      plans = (
        await query(
          `SELECT * FROM adherence_plans WHERE program_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [program.id]
        )
      ).rows;
    } catch {
      plans = [];
    }
    try {
      adverse = (
        await query(
          `SELECT * FROM adverse_events WHERE program_id = $1 ORDER BY reported_at DESC LIMIT 10`,
          [program.id]
        )
      ).rows;
    } catch {
      adverse = [];
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed';
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/programs">← Programs</Link>
      </main>
    );
  }
  if (!program) notFound();

  const activeMeds = meds.filter((x) => x.is_active).length;
  const latest = assessments[0];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/programs" className="text-blue-600 hover:underline">← Programs</Link>
          <Link href="/pms" className="text-blue-600 hover:underline">PMS</Link>
          <Link href="/psp" className="text-blue-600 hover:underline">Journey</Link>
          <Link href="/care-line" className="text-blue-600 hover:underline">Care Line</Link>
        </div>

        <header className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <h1 className="text-xl font-semibold font-mono">{program.program_code}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{program.status}</span>
              {program.journey_stage && (
                <span className="rounded bg-indigo-50 text-indigo-800 px-2 py-0.5 text-xs">
                  {JOURNEY_LABELS_AR[program.journey_stage] || program.journey_stage}
                </span>
              )}
              {program.eligibility_tier && (
                <span className="rounded bg-teal-50 text-teal-800 px-2 py-0.5 text-xs">
                  {ELIGIBILITY_LABELS_AR[program.eligibility_tier] || program.eligibility_tier}
                </span>
              )}
              {latest?.risk_band && (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_COLOR[latest.risk_band] || 'bg-slate-100'}`}>
                  PNAT: {latest.risk_band}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm">
            <span className="font-medium">{program.patient_name}</span>
            <span className="text-slate-500"> ({program.relation})</span>
          </p>
          <p className="text-sm text-slate-600">
            Employee: {program.employee_name} · {program.external_employee_id}
            {program.employee_phone ? ` · ${program.employee_phone}` : ''}
          </p>
          <ProgramStatusActions programId={program.id} status={program.status} />
        </header>

        <section className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-medium">Eligibility (PFET-style)</h2>
          <PfetForm programId={program.id} />
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
          <h2 className="font-medium">Adherence (PNAT-style)</h2>
          <PnatForm programId={program.id} medCount={activeMeds} />
          {plans.filter((x) => x.status === 'active').map((pl) => (
            <div key={pl.id} className="text-xs rounded border p-2 bg-indigo-50/50">
              Plan · {pl.risk_band} · review {String(pl.next_review_at).slice(0, 10)}
              <div className="text-indigo-800 mt-1">
                {Array.isArray(pl.interventions) ? pl.interventions.join(' · ') : String(pl.interventions || '')}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
          <h2 className="font-medium">Care Line</h2>
          <CareLinePanel programId={program.id} />
          {contacts.length > 0 && (
            <ul className="text-xs space-y-1 border-t pt-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap gap-2 text-slate-600">
                  <span className="font-mono">{String(c.contacted_at).slice(0, 16).replace('T', ' ')}</span>
                  <span>{c.channel}</span>
                  <span>{c.outcome || '—'}</span>
                  <span className="text-slate-400">{c.notes || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-medium">Pharmacy release letter</h2>
          <ReleaseLetterButton programId={program.id} />
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-medium">Adverse events</h2>
          <AdverseEventForm programId={program.id} />
          {adverse.length > 0 && (
            <ul className="text-xs space-y-2 border-t pt-2">
              {adverse.map((ae) => (
                <li key={ae.id} className="rounded border p-2">
                  <span className="font-medium text-red-700">{ae.severity}</span>
                  <span className="text-slate-500 ml-2">{String(ae.reported_at).slice(0, 10)}</span>
                  <p className="mt-1">{ae.description}</p>
                  {ae.med_name && <p className="text-slate-500">Med: {ae.med_name}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-medium mb-3">Documents</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="text-sm space-y-2">
              {attachments.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-2">
                  <span className="text-xs bg-slate-100 rounded-full px-2">{DOC_TYPE_LABELS_AR[a.doc_type] || a.doc_type}</span>
                  <a href={a.url} className="text-blue-600 text-xs break-all" target="_blank" rel="noreferrer">
                    {a.file_name || a.url.slice(0, 40)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50">Medications</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="p-2">#</th>
                <th className="p-2">Requested</th>
                <th className="p-2">Matched</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Formulary</th>
                <th className="p-2">Active</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id} className={`border-t ${!m.is_active ? 'opacity-50' : ''}`}>
                  <td className="p-2 font-mono text-xs">{m.line_code}</td>
                  <td className="p-2">{m.requested_name}</td>
                  <td className="p-2">{m.matched_name || '—'}</td>
                  <td className="p-2">{m.qty_per_cycle}</td>
                  <td className="p-2 text-xs">{m.formulary_flag || '—'}</td>
                  <td className="p-2 text-xs">{m.is_active ? 'yes' : 'no'}</td>
                  <td className="p-2">
                    <MedLineToggle programId={program.id} lineId={m.id} isActive={!!m.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <h2 className="p-3 font-medium border-b bg-slate-50">Refill cycles</h2>
          {refills.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No cycles yet</p>
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
                      <Link href={`/refills/${rc.id}`} className="text-blue-600 text-xs hover:underline">Open</Link>
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
