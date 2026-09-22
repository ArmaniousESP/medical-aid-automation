/**
 * Shared clinical / ops triage disclaimer.
 * Shown on DDI, allergy, combinations, and related tools.
 */

export function ClinicalDisclaimer({
  compact = false,
  extra,
}: {
  compact?: boolean;
  extra?: string;
}) {
  if (compact) {
    return (
      <p className="text-[10px] text-slate-500 leading-relaxed">
        <strong className="text-slate-600">Not clinical decision support.</strong>{' '}
        For pharmacy/ops triage only. Confirm with a licensed clinician before
        changing therapy. DDInter data: CC BY-NC-SA 4.0.
        {extra ? ` ${extra}` : ''}
      </p>
    );
  }

  return (
    <aside
      className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 space-y-1.5"
      role="note"
    >
      <p className="font-semibold text-amber-900">Clinical disclaimer</p>
      <ul className="list-disc list-inside space-y-1 text-amber-900/90">
        <li>
          This software supports <strong>operational triage</strong> for corporate
          medical-aid workflows. It is <strong>not</strong> a licensed clinical
          decision-support (CDS) product and does not replace pharmacist or
          physician judgment.
        </li>
        <li>
          Drug–drug interaction data (when loaded) comes from{' '}
          <a
            href="https://ddinter2.scbdd.com"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            DDInter 2.0
          </a>{' '}
          under <strong>CC BY-NC-SA 4.0</strong> (non-commercial). Coverage and
          severity labels may be incomplete for Egyptian trade names.
        </li>
        <li>
          Allergy cross-reactivity rules are simplified heuristics (e.g. beta-lactam
          side-chain awareness, sulfa, NSAID class). True risk depends on reaction
          phenotype, timing, and patient factors — seek allergy consultation for
          severe or anaphylaxis history.
        </li>
        <li>
          Brand→ingredient synonyms are operational mappings and may be wrong or
          outdated. Always verify the active substance on the product label.
        </li>
        <li>
          Do not withhold or substitute therapy solely on automated flags without
          clinical review.
        </li>
      </ul>
      {extra && <p className="text-amber-900/80 pt-1">{extra}</p>}
    </aside>
  );
}
