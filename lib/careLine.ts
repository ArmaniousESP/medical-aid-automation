import { query } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';

/** Axios-style care line emphasizes phone over email for persistence */
export const CARE_CHANNELS = ['phone', 'sms', 'whatsapp', 'email', 'in_person'] as const;

export const CARE_OUTCOMES = [
  'reached',
  'voicemail',
  'no_answer',
  'refused',
  'scheduled_refill',
  'education_done',
  'escalated',
  'other',
] as const;

/** WHO-dimension aligned dropout reason codes */
export const DROPOUT_REASONS = [
  { code: 'cost', label_ar: 'تكلفة / عبء مالي', dimension: 'social_economic' },
  { code: 'access_system', label_ar: 'صعوبة المنظومة / التجديد / الصرف', dimension: 'health_system' },
  { code: 'condition_improved', label_ar: 'تحسّن الأعراض / إيقاف ذاتي', dimension: 'condition' },
  { code: 'side_effects', label_ar: 'آثار جانبية / صعوبة العلاج', dimension: 'therapy' },
  { code: 'complex_regimen', label_ar: 'تعقيد الجدول الدوائي', dimension: 'therapy' },
  { code: 'forgot_disengaged', label_ar: 'نسيان / انقطاع عن المتابعة', dimension: 'patient' },
  { code: 'beliefs', label_ar: 'معتقدات حول الدواء أو المرض', dimension: 'patient' },
  { code: 'moved_transferred', label_ar: 'نقل / ترك العمل / تأمين آخر', dimension: 'social_economic' },
  { code: 'deceased', label_ar: 'وفاة', dimension: 'condition' },
  { code: 'other', label_ar: 'أخرى', dimension: 'patient' },
] as const;

export async function ensureCareLineTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS care_line_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES chronic_programs(id) ON DELETE CASCADE,
        channel TEXT NOT NULL DEFAULT 'phone',
        direction TEXT NOT NULL DEFAULT 'outbound',
        outcome TEXT,
        notes TEXT,
        actor TEXT,
        contacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await query(
      `ALTER TABLE chronic_programs
         ADD COLUMN IF NOT EXISTS dropout_reason TEXT,
         ADD COLUMN IF NOT EXISTS dropout_at TIMESTAMPTZ`
    );
  } catch {
    /* ignore */
  }
}

async function employeePhoneForProgram(programId: string) {
  const res = await query<{ phone: string | null; employee_name: string; patient_name: string }>(
    `SELECT e.phone, e.full_name AS employee_name, d.full_name AS patient_name
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     WHERE cp.id = $1`,
    [programId]
  );
  return res.rows[0] || null;
}

export async function logCareContact(input: {
  program_id: string;
  channel?: string;
  direction?: string;
  outcome?: string;
  notes?: string;
  actor?: string;
  contacted_at?: string;
  /** Also push WhatsApp care_line_followup if phone exists */
  send_whatsapp?: boolean;
  whatsapp_dry_run?: boolean;
}) {
  await ensureCareLineTable();
  const ins = await query<{ id: string }>(
    `INSERT INTO care_line_contacts (
       program_id, channel, direction, outcome, notes, actor, contacted_at
     ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))
     RETURNING id`,
    [
      input.program_id,
      input.channel || 'phone',
      input.direction || 'outbound',
      input.outcome || null,
      input.notes || null,
      input.actor || 'care-line',
      input.contacted_at || null,
    ]
  );

  await query(
    `UPDATE chronic_programs SET
       journey_stage = CASE
         WHEN coalesce(journey_stage,'enrolled') IN ('enrolled','on_treatment')
         THEN 'follow_up'
         ELSE journey_stage
       END,
       updated_at = now()
     WHERE id = $1
       AND coalesce(journey_stage,'') NOT IN ('completed','dropped_out','suspended')`,
    [input.program_id]
  );

  let wa: { ok: boolean; dry_run?: boolean; error?: string } | null = null;
  if (input.send_whatsapp) {
    const info = await employeePhoneForProgram(input.program_id);
    if (info?.phone) {
      const r = await sendWhatsApp({
        to: info.phone,
        template: 'care_line_followup',
        program_id: input.program_id,
        dry_run: input.whatsapp_dry_run,
        vars: {
          name: info.employee_name,
          patient: info.patient_name,
          note: input.notes || '',
        },
      });
      wa = { ok: r.ok, dry_run: r.dry_run, error: r.error };
    } else {
      wa = { ok: false, error: 'no phone' };
    }
  }

  return { id: ins.rows[0].id, whatsapp: wa };
}

export async function listCareContacts(programId: string, limit = 20) {
  await ensureCareLineTable();
  const res = await query(
    `SELECT * FROM care_line_contacts
     WHERE program_id = $1
     ORDER BY contacted_at DESC
     LIMIT $2`,
    [programId, limit]
  );
  return res.rows;
}

export async function markDropout(input: {
  program_id: string;
  reason_code: string;
  notes?: string;
  actor?: string;
}) {
  await ensureCareLineTable();
  const reason =
    DROPOUT_REASONS.find((r) => r.code === input.reason_code)?.code || 'other';

  await query(
    `UPDATE chronic_programs SET
       status = 'cancelled',
       journey_stage = 'dropped_out',
       dropout_reason = $2,
       dropout_at = now(),
       notes = CASE
         WHEN $3::text IS NOT NULL AND $3 <> ''
         THEN coalesce(notes,'') || E'\n[dropout] ' || $3
         ELSE notes
       END,
       updated_at = now()
     WHERE id = $1`,
    [input.program_id, reason, input.notes || null]
  );

  await logCareContact({
    program_id: input.program_id,
    channel: 'phone',
    outcome: 'other',
    notes: `Dropout: ${reason}${input.notes ? ' — ' + input.notes : ''}`,
    actor: input.actor || 'dropout',
  });

  return { ok: true, reason };
}

export async function getReleaseCalendar(opts?: {
  period?: string;
  limit?: number;
}) {
  const d = new Date();
  const period =
    opts?.period ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const limit = Math.min(opts?.limit ?? 100, 300);

  const res = await query(
    `SELECT
       cp.id AS program_id,
       cp.program_code,
       e.full_name AS employee_name,
       e.external_employee_id AS employee_id,
       e.phone,
       d.full_name AS patient_name,
       coalesce(cp.journey_stage, 'enrolled') AS journey_stage,
       (SELECT risk_band FROM adherence_assessments aa
         WHERE aa.program_id = cp.id ORDER BY assessed_at DESC LIMIT 1) AS latest_risk,
       (SELECT max(contacted_at) FROM care_line_contacts c
         WHERE c.program_id = cp.id) AS last_contact_at,
       rc.id AS cycle_id,
       rc.status AS cycle_status,
       rc.external_claim_id AS claim_id
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     LEFT JOIN refill_cycles rc
       ON rc.program_id = cp.id AND rc.period = $1
     WHERE cp.status = 'active'
     ORDER BY
       CASE WHEN rc.status IS NULL OR rc.status NOT IN ('dispensed') THEN 0 ELSE 1 END,
       e.full_name
     LIMIT $2`,
    [period, limit]
  );

  return {
    period,
    release_window: {
      from: `${period}-01`,
      to: `${period}-07`,
    },
    rows: res.rows.map((r: any) => ({
      ...r,
      due:
        !r.cycle_status ||
        !['dispensed', 'cancelled'].includes(r.cycle_status),
    })),
  };
}
