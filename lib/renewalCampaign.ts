import { query } from '@/lib/db';
import { ensurePriorRegimenTables, RENEWAL_DEADLINE, RENEWAL_YEAR } from '@/lib/priorRegimens';
import { renewalReminderMessage, filterRenewalRecipients } from '@/lib/renewalWhatsApp';
import { sendWhatsApp, normalizePhone } from '@/lib/whatsapp';

export type RenewalRecipient = {
  id: string;
  company: string;
  emp_name: string;
  emp_id: string | null;
  phone: string | null;
  patient_name: string;
  renewal_status: string;
  med_count: number;
};

export async function listRenewalRecipients(opts?: {
  only_pending?: boolean;
  limit?: number;
}): Promise<RenewalRecipient[]> {
  await ensurePriorRegimenTables();
  const limit = Math.min(opts?.limit ?? 500, 1000);
  const onlyPending = opts?.only_pending !== false;

  const res = await query<{
    id: string;
    company: string;
    emp_name: string;
    emp_id: string | null;
    phone: string | null;
    patient_name: string;
    renewal_status: string;
    med_count: number;
  }>(
    `SELECT id, company, emp_name, emp_id, phone, patient_name, renewal_status,
            jsonb_array_length(meds)::int AS med_count
     FROM prior_regimens
     WHERE ($1::boolean = false OR renewal_status <> 'renewed_2027')
     ORDER BY company, emp_name, patient_name
     LIMIT $2`,
    [onlyPending, limit]
  );
  return res.rows;
}

/** Dry-run or live WhatsApp renewal reminders for pending 2026 regimens */
export async function notifyRenewalCampaign(opts?: {
  dry_run?: boolean;
  limit?: number;
  company?: string;
}) {
  await ensurePriorRegimenTables();
  const limit = Math.min(opts?.limit ?? 50, 200);
  const company = opts?.company?.trim();

  const res = await query<{
    id: string;
    company: string;
    emp_name: string;
    emp_id: string | null;
    phone: string | null;
    patient_name: string;
    renewal_status: string;
  }>(
    `SELECT id, company, emp_name, emp_id, phone, patient_name, renewal_status
     FROM prior_regimens
     WHERE renewal_status <> 'renewed_2027'
       AND phone IS NOT NULL AND trim(phone) <> ''
       AND ($1::text IS NULL OR lower(trim(company)) = lower(trim($1)))
     ORDER BY company, emp_name
     LIMIT $2`,
    [company || null, limit]
  );

  const recipients = filterRenewalRecipients(res.rows);
  const results: Array<{
    regimen_id: string;
    emp_name: string;
    patient_name: string;
    phone: string | null;
    ok: boolean;
    dry_run?: boolean;
    error?: string;
    message_preview?: string;
  }> = [];

  const profileUrl = 'https://medical-aid-automation.vercel.app/me';

  for (const r of recipients) {
    const message = renewalReminderMessage({
      empName: r.emp_name,
      patientName: r.patient_name,
      profileUrl,
    });
    const sent = await sendWhatsApp({
      to: r.phone || '',
      template: 'custom',
      dry_run: opts?.dry_run !== false, // default dry-run true for safety
      vars: { message },
    });
    results.push({
      regimen_id: r.id,
      emp_name: r.emp_name,
      patient_name: r.patient_name,
      phone: normalizePhone(r.phone),
      ok: sent.ok,
      dry_run: sent.dry_run,
      error: sent.error,
      message_preview: message.slice(0, 160),
    });
  }

  return {
    renewal_year: RENEWAL_YEAR,
    deadline: RENEWAL_DEADLINE,
    dry_run: opts?.dry_run !== false,
    candidate_rows: res.rows.length,
    attempted: results.length,
    ok_count: results.filter((x) => x.ok).length,
    results,
  };
}
