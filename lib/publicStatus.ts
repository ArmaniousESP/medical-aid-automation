/**
 * Public, limited request status lookup (no full patient lists).
 */

import { query } from '@/lib/db';
import { ensureIntakeTables } from '@/lib/intake';

export type PublicStatus = {
  id: string;
  status: string;
  status_label_ar: string;
  status_label_en: string;
  emp_name_masked: string;
  patient_name_masked: string;
  created_at: string | null;
  updated_at: string | null;
  med_count: number;
  /** High-level only — not full match notes */
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

/**
 * Lookup by request UUID. Optional phone or emp_id must match if provided
 * (extra verification when the user has those details).
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
    phone: string | null;
    patient_name: string | null;
    meds: unknown;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, status, emp_name, emp_id, phone, patient_name, meds,
            created_at::text, updated_at::text
     FROM aid_requests WHERE id = $1::uuid`,
    [id]
  );
  const row = res.rows[0];
  if (!row) return null;

  if (opts.phone?.trim()) {
    const p = opts.phone.replace(/\D/g, '');
    const stored = String(row.phone || '').replace(/\D/g, '');
    if (stored && p && !stored.endsWith(p.slice(-7)) && stored !== p) {
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

  const meds = Array.isArray(row.meds) ? row.meds : [];
  const lab = LABELS[row.status] || {
    ar: row.status,
    en: row.status,
    hint: 'Status updated.',
  };

  return {
    id: row.id,
    status: row.status,
    status_label_ar: lab.ar,
    status_label_en: lab.en,
    emp_name_masked: maskName(row.emp_name),
    patient_name_masked: maskName(row.patient_name),
    created_at: row.created_at,
    updated_at: row.updated_at,
    med_count: meds.length,
    stage_hint: lab.hint,
  };
}
