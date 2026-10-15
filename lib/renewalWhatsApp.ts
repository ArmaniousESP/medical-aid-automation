import { RENEWAL_DEADLINE, RENEWAL_YEAR } from '@/lib/priorRegimens';

/** Bilingual WhatsApp body for annual chronic-support renewal outreach */
export function renewalReminderMessage(opts?: {
  empName?: string;
  patientName?: string;
  profileUrl?: string;
}): string {
  const name = opts?.empName?.trim() || 'زميلنا / زميلتنا';
  const patient = opts?.patientName?.trim();
  const url =
    opts?.profileUrl ||
    'https://medical-aid-automation.vercel.app/me';
  const deadline = RENEWAL_DEADLINE; // YYYY-MM-DD
  const [y, m, d] = deadline.split('-');
  const deadlineAr = `${Number(d)}/${Number(m)}/${y}`;
  const deadlineEn = `${Number(d)} Dec ${y}`;

  const patientLine = patient
    ? `\nالمريض: ${patient}\nPatient: ${patient}`
    : '';

  return (
    `مرحباً ${name} 👋\n` +
    `حان موعد تأكيد دعم الأدوية المزمنة لعام ${RENEWAL_YEAR}.\n` +
    `Please confirm your chronic medicine support for ${RENEWAL_YEAR}.\n\n` +
    `افتح ملفك → راجع علاج 2026 → اضغط «تجديد لـ ${RENEWAL_YEAR}»\n` +
    `Open My profile → review your 2026 regimen → tap Renew for ${RENEWAL_YEAR}.\n` +
    patientLine +
    `\n\nالموعد المستهدف: ${deadlineAr}\n` +
    `Target date: ${deadlineEn}\n\n` +
    `${url}\n\n` +
    `يمكنك تعديل الأدوية إذا تغيّر الروشتة قبل الإرسال.\n` +
    `You can adjust medicines if the prescription changed, then submit.`
  );
}

export type RenewalCampaignRow = {
  company: string;
  emp_name: string;
  emp_id: string | null;
  phone: string | null;
  patient_name: string;
  renewal_status: string;
};

/** Only pending renewals with a phone number */
export function filterRenewalRecipients(
  rows: RenewalCampaignRow[]
): RenewalCampaignRow[] {
  return rows.filter(
    (r) =>
      r.renewal_status !== 'renewed_2027' &&
      !!(r.phone && r.phone.replace(/\D/g, '').length >= 8)
  );
}
