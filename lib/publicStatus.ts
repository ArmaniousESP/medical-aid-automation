/**
 * Public request status lookup.
 * Names are masked by default; full names when phone or emp_id verifies ownership.
 */

import { query } from '@/lib/db';
import { ensureIntakeTables } from '@/lib/intake';

export type PublicStatus = {
  id: string;
  status: string;
  status_label_ar: string;
  status_label_en: string;
  /** Always present — masked for strangers, full when verified */
  emp_name_masked: string;
  patient_name_masked: string;
  /** Full names only when the caller proves ownership */
  emp_name?: string;
  patient_name?: string;
  company?: string;
  emp_id?: string | null;
  verified: boolean;
  created_at: string | null;
  updated_at: string | null;
  med_count: number;
  /** Medicine names only when verified */
  meds?: { name: string; qty: number }[];
  stage_hint: string;
};

const LABELS: Record<
  string,
  { ar: string; en: string; hint: string }
> = {
  submitted: {
    ar: 'تم الاستلام',
    en: 'Received',
    hint: 'Your request is in the queue for review.',
  },
  triage: {
    ar: 'قيد المراجعة',
    en: 'Under review',
    hint: 'Medicines are being matched.',
  },
  approved: {
    ar: 'معتمد',
    en: 'Approved',
    hint: 'Approved for the program.',
  },
  enrolled: {
    ar: 'مسجّل في البرنامج',
    en: 'Enrolled',
    hint: 'Enrolled in the monthly program.',
  },
  dispensed: {
    ar: 'تم الصرف',
    en: 'Dispensed',
    hint: 'Medicines have been dispensed.',
  },
  rejected: {
    ar: 'مرفوض',
    en: 'Rejected',
    hint: 'Contact your HR / aid office for details.',
  },
  cancelled: {
    ar: 'ملغى',
    en: 'Cancelled',
    hint: 'This request was cancelled.',
  },
};

function maskName(name: string | null | undefined): string {
  const s = String(name || '').trim();
  if (!s) return '—';
  const parts = s.split(/\s+/);
  return parts
    .map((p, i) => (i === 0 ? p : p[0] ? p[0] + '***' : ''))
    .join(' ');
}

function normPhone(p: string): string {
  let d = p.replace(/\D/g, '');
  if (d.startsWith('20') && d.length > 10) d = d.slice(2);
  if (d && !d.startsWith('0') && (d.length === 9 || d.length === 10)) d = '0' + d;
  return d;
}

function phonesMatch(stored?: string | null, given?: string | null): boolean {
  if (!stored || !given) return false;
  const a = normPhone(stored);
  const b = normPhone(given);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.length >= 8) return a.slice(-8) === b.slice(-8);
  return false;
}

/**
 * Lookup by request UUID.
 * Pass phone and/or emp_id matching the request to unlock full names + med list.
 */
export async function getPublicRequestStatus(opts: {
  id: string;
  phone?: string;
  emp_id?: string;
}): Promise<PublicStatus | null> {
  await ensureIntakeTables();
  const id = opts.id.trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const res = await query<{
    id: string;
    status: string;
    emp_name: string;
    emp_id: string | null;
    company: string | null;
    phone: string | null;
    patient_name: string | null;
    meds: unknown;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, status, emp_name, emp_id, company, phone, patient_name, meds,
            created_at::text, updated_at::text
     FROM aid_requests WHERE id = $1::uuid`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;

  // Soft verification: if caller supplies phone/emp_id that does NOT match, hide the row
  if (opts.phone?.trim()) {
    if (row.phone && !phonesMatch(row.phone, opts.phone)) {
      return null;
    }
  }
  if (opts.emp_id?.trim()) {
    if (
      row.emp_id &&
      row.emp_id.trim().toLowerCase() !== opts.emp_id.trim().toLowerCase()
    ) {
      return null;
    }
  }

  const phoneOk = !!(opts.phone?.trim() && phonesMatch(row.phone, opts.phone));
  const empOk =
    !!(opts.emp_id?.trim() &&
      row.emp_id &&
      row.emp_id.trim().toLowerCase() === opts.emp_id.trim().toLowerCase());
  // Owner if either credential matches the stored request
  const verified = phoneOk || empOk;

  const medsRaw = Array.isArray(row.meds) ? row.meds : [];
  const meds = medsRaw
    .map((m: unknown) => {
      const x = m as { name?: string; qty?: number };
      return {
        name: String(x?.name || '').trim(),
        qty: Number(x?.qty) || 1,
      };
    })
    .filter((m) => m.name);

  const lab = LABELS[row.status] || {
    ar: row.status,
    en: row.status,
    hint: 'Status updated.',
  };

  const base: PublicStatus = {
    id: row.id,
    status: row.status,
    status_label_ar: lab.ar,
    status_label_en: lab.en,
    emp_name_masked: maskName(row.emp_name),
    patient_name_masked: maskName(row.patient_name),
    verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
    med_count: meds.length,
    stage_hint: lab.hint,
  };

  if (verified) {
    base.emp_name = row.emp_name || undefined;
    base.patient_name = row.patient_name || undefined;
    base.company = row.company || undefined;
    base.emp_id = row.emp_id;
    base.meds = meds;
  }

  return base;
}
