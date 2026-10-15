'use client';

import { useEffect, useRef } from 'react';

type MedLine = { name: string; qty: number };

export type IntakePrefillPatch = {
  emp_name?: string;
  emp_id?: string;
  company?: string;
  phone?: string;
  patient_name?: string;
  relation?: string;
  meds?: MedLine[];
  comments?: string;
  hint?: string;
  regimen_id?: string;
};

function parseMedsParam(raw: string | null): MedLine[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((s) => {
      const pipe = s.indexOf('|');
      if (pipe < 0) {
        const name = s.trim();
        return name ? { name, qty: 1 } : null;
      }
      const name = s.slice(0, pipe).trim();
      const qty = Number(s.slice(pipe + 1)) || 1;
      return name ? { name, qty } : null;
    })
    .filter((m): m is MedLine => !!m);
}

/**
 * Applies ?company=&emp_id=&phone=&patient=&meds=&regimen_id=&renew=2027
 * from My profile "Renew this for 2027".
 * Prefer regimen_id (loads full med list from API) over long meds query string.
 */
export function IntakeUrlPrefill(props: {
  onApply: (patch: IntakePrefillPatch) => void;
}) {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    async function run() {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (![...sp.keys()].length) return;

        const patch: IntakePrefillPatch = {};
        if (sp.get('company')) patch.company = sp.get('company') || undefined;
        if (sp.get('emp_id')) patch.emp_id = sp.get('emp_id') || undefined;
        if (sp.get('phone')) patch.phone = sp.get('phone') || undefined;
        if (sp.get('emp_name')) patch.emp_name = sp.get('emp_name') || undefined;
        if (sp.get('patient')) patch.patient_name = sp.get('patient') || undefined;

        const regimenId = sp.get('regimen_id');
        let meds = parseMedsParam(sp.get('meds'));

        if (regimenId) {
          patch.regimen_id = regimenId;
          try {
            const res = await fetch(
              `/api/employee/regimens?id=${encodeURIComponent(regimenId)}`
            );
            const data = await res.json();
            if (res.ok && data.ok && data.regimen) {
              const r = data.regimen;
              if (!patch.company && r.company) patch.company = r.company;
              if (!patch.emp_name && r.emp_name) patch.emp_name = r.emp_name;
              if (!patch.emp_id && r.emp_id) patch.emp_id = r.emp_id;
              if (!patch.phone && r.phone) patch.phone = r.phone;
              if (!patch.patient_name && r.patient_name)
                patch.patient_name = r.patient_name;
              const fromDb = (r.meds || [])
                .map((m: { name?: string; requested_name?: string; qty?: number }) => ({
                  name: String(m.name || m.requested_name || '').trim(),
                  qty: Number(m.qty) || 1,
                }))
                .filter((m: MedLine) => m.name);
              if (fromDb.length) meds = fromDb;
            }
          } catch {
            /* fall back to meds query param */
          }
        }

        if (meds.length) patch.meds = meds;

        if (sp.get('renew') === '2027') {
          patch.comments =
            'Renewal for 2027 chronic medicine support · تجديد دعم 2027';
          patch.hint =
            '2027 renewal — form pre-filled from last year. Review medicines, update if needed, then submit.';
          // Default relation: same name as employee → self
          if (
            patch.patient_name &&
            patch.emp_name &&
            patch.patient_name.replace(/\s+/g, '') ===
              patch.emp_name.replace(/\s+/g, '')
          ) {
            patch.relation = 'self';
          } else if (patch.patient_name) {
            patch.relation = 'dependent';
          }
        } else if (Object.keys(patch).length) {
          patch.hint = 'Form pre-filled from your profile';
        }

        if (Object.keys(patch).length) props.onApply(patch);
      } catch {
        /* ignore */
      }
    }

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
