'use client';

import { useEffect } from 'react';

type MedLine = { name: string; qty: number };

/**
 * Applies ?company=&emp_id=&phone=&patient=&meds=name|qty;...&renew=2027
 * from My profile "Renew for 2027" links.
 */
export function IntakeUrlPrefill(props: {
  onApply: (patch: {
    emp_name?: string;
    emp_id?: string;
    company?: string;
    phone?: string;
    patient_name?: string;
    meds?: MedLine[];
    comments?: string;
    hint?: string;
  }) => void;
}) {
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (![...sp.keys()].length) return;
      const patch: Parameters<typeof props.onApply>[0] = {};
      if (sp.get('company')) patch.company = sp.get('company') || undefined;
      if (sp.get('emp_id')) patch.emp_id = sp.get('emp_id') || undefined;
      if (sp.get('phone')) patch.phone = sp.get('phone') || undefined;
      if (sp.get('emp_name')) patch.emp_name = sp.get('emp_name') || undefined;
      if (sp.get('patient')) patch.patient_name = sp.get('patient') || undefined;
      const medsParam = sp.get('meds');
      if (medsParam) {
        const parsed = medsParam
          .split(';')
          .map((s) => {
            const [name, qty] = s.split('|');
            return { name: (name || '').trim(), qty: Number(qty) || 1 };
          })
          .filter((m) => m.name);
        if (parsed.length) patch.meds = parsed;
      }
      if (sp.get('renew') === '2027') {
        patch.comments = 'Renewal for 2027 chronic medicine support · تجديد دعم 2027';
        patch.hint =
          '2027 renewal pre-filled — review medicines, update if needed, then submit';
      } else if (Object.keys(patch).length) {
        patch.hint = 'Form pre-filled from your profile';
      }
      if (Object.keys(patch).length) props.onApply(patch);
    } catch {
      /* ignore */
    }
    // once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
