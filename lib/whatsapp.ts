import { query } from '@/lib/db';
import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

export type WaTemplateKey =
  | 'refill_due'
  | 'refill_ready'
  | 'pnat_high_risk'
  | 'care_line_followup'
  | 'safety_alert'
  | 'custom';

export const WA_TEMPLATES: Record<
  WaTemplateKey,
  { key: WaTemplateKey; label_ar: string; body: (p: Record<string, string>) => string }
> = {
  refill_due: {
    key: 'refill_due',
    label_ar: 'تذكير استحقاق صرف',
    body: (p) =>
      `مرحباً ${p.name || ''}،\nتذكير: موعد صرف العلاج الشهري لـ ${p.patient || 'المريض'} عن شهر ${p.period || ''}.\nالرجاء التواصل مع البرنامج أو الصيدلية المعتمدة.\n— دعم العلاج الشهري`,
  },
  refill_ready: {
    key: 'refill_ready',
    label_ar: 'جاهز للاستلام',
    body: (p) =>
      `مرحباً ${p.name || ''}،\nطلب العلاج لـ ${p.patient || ''} أصبح جاهزاً للاستلام (${p.claim || ''}).\n— دعم العلاج الشهري`,
  },
  pnat_high_risk: {
    key: 'pnat_high_risk',
    label_ar: 'متابعة التزام',
    body: (p) =>
      `مرحباً ${p.name || ''}،\nنود المتابعة بشأن انتظام العلاج لـ ${p.patient || ''}. فريق الرعاية سيتواصل معكم.\n— دعم العلاج الشهري`,
  },
  care_line_followup: {
    key: 'care_line_followup',
    label_ar: 'متابعة خط الرعاية',
    body: (p) =>
      `مرحباً ${p.name || ''}،\nمتابعة من خط الرعاية بخصوص ${p.patient || ''}${p.note ? ': ' + p.note : '.'}\n— دعم العلاج الشهري`,
  },
  safety_alert: {
    key: 'safety_alert',
    label_ar: 'تنبيه سلامة صرف (للفريق)',
    body: (p) =>
      `⚠️ Safety queue alert\n` +
      `Flagged cycles: ${p.flagged || '0'} (scanned ${p.scanned || '0'})\n` +
      `${p.summary || ''}\n` +
      `Review: ${p.link || '/refills/safety'}\n` +
      `— Medical aid ops (triage only, not CDS)`,
  },
  custom: {
    key: 'custom',
    label_ar: 'رسالة مخصصة',
    body: (p) => p.message || '',
  },
};

/** Normalize EG phones to E.164-ish digits */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1);
  if (d.length === 10 && d.startsWith('1')) d = '20' + d;
  if (!d.startsWith('20') && d.length < 11) return null;
  return d;
}

export type SendResult = {
  ok: boolean;
  dry_run?: boolean;
  provider?: string;
  message_id?: string;
  error?: string;
  body?: string;
  to?: string;
  attempts?: number;
};

function providerMode(): 'meta' | 'twilio' | 'webhook' | 'none' {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
    return 'meta';
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  )
    return 'twilio';
  if (process.env.WHATSAPP_WEBHOOK_URL) return 'webhook';
  return 'none';
}

async function sendMeta(to: string, body: string): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const retry = webhookRetryDefaults();

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      },
      retry
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        provider: 'meta',
        error:
          data?.error?.message ||
          JSON.stringify(data) ||
          errors.join('; '),
        to,
        body,
        attempts,
      };
    }
    return {
      ok: true,
      provider: 'meta',
      message_id: data?.messages?.[0]?.id,
      to,
      body,
      attempts,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'meta',
      error: e instanceof Error ? e.message : 'meta fetch failed',
      to,
      body,
      attempts: retry.maxAttempts,
    };
  }
}

async function sendTwilio(to: string, body: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:+${to}`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: toWa,
    Body: body,
  });
  const retry = webhookRetryDefaults();

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
      retry
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        provider: 'twilio',
        error: data?.message || JSON.stringify(data) || errors.join('; '),
        to,
        body,
        attempts,
      };
    }
    return {
      ok: true,
      provider: 'twilio',
      message_id: data?.sid,
      to,
      body,
      attempts,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'twilio',
      error: e instanceof Error ? e.message : 'twilio fetch failed',
      to,
      body,
      attempts: retry.maxAttempts,
    };
  }
}

async function sendWebhook(
  to: string,
  body: string,
  meta: Record<string, unknown>
): Promise<SendResult> {
  const url = process.env.WHATSAPP_WEBHOOK_URL!;
  const retry = webhookRetryDefaults();
  const payload = JSON.stringify({
    to,
    body,
    channel: 'whatsapp',
    ...meta,
  });

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.WHATSAPP_WEBHOOK_SECRET
            ? { 'X-Webhook-Secret': process.env.WHATSAPP_WEBHOOK_SECRET }
            : {}),
        },
        body: payload,
      },
      retry
    );
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        provider: 'webhook',
        error: text.slice(0, 500) || errors.join('; ') || `HTTP ${response.status}`,
        to,
        body,
        attempts,
      };
    }
    return {
      ok: true,
      provider: 'webhook',
      message_id: text.slice(0, 80) || `webhook-ok-${attempts}`,
      to,
      body,
      attempts,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'webhook',
      error: e instanceof Error ? e.message : 'webhook fetch failed',
      to,
      body,
      attempts: retry.maxAttempts,
    };
  }
}

export async function sendWhatsApp(input: {
  to: string;
  template: WaTemplateKey;
  vars?: Record<string, string>;
  program_id?: string;
  dry_run?: boolean;
}): Promise<SendResult & { log_id?: string }> {
  const to = normalizePhone(input.to);
  if (!to) {
    return { ok: false, error: 'invalid phone' };
  }

  const tpl = WA_TEMPLATES[input.template] || WA_TEMPLATES.custom;
  const body = tpl.body(input.vars || {});
  if (!body.trim()) {
    return { ok: false, error: 'empty message body' };
  }

  const mode = providerMode();
  const forceDry =
    input.dry_run || process.env.WHATSAPP_DRY_RUN === '1' || mode === 'none';

  let result: SendResult;

  if (forceDry) {
    result = {
      ok: true,
      dry_run: true,
      provider: mode === 'none' ? 'none' : mode,
      to,
      body,
      message_id: `dry-${Date.now()}`,
      attempts: 1,
    };
  } else if (mode === 'meta') {
    result = await sendMeta(to, body);
  } else if (mode === 'twilio') {
    result = await sendTwilio(to, body);
  } else {
    result = await sendWebhook(to, body, {
      template: input.template,
      program_id: input.program_id,
    });
  }

  try {
    const ins = await query<{ id: string }>(
      `INSERT INTO notification_log (
         channel, template_key, recipient_phone, program_id, payload, status, provider_response, error, sent_at
       ) VALUES (
         'whatsapp', $1, $2, $3, $4::jsonb, $5, $6, $7,
         CASE WHEN $5 = 'sent' OR $5 = 'dry_run' THEN now() ELSE NULL END
       ) RETURNING id`,
      [
        input.template,
        to,
        input.program_id || null,
        JSON.stringify({
          vars: input.vars,
          body,
          provider: result.provider,
          attempts: result.attempts ?? 1,
        }),
        result.dry_run ? 'dry_run' : result.ok ? 'sent' : 'failed',
        result.message_id || null,
        result.error || null,
      ]
    );
    return { ...result, log_id: ins.rows[0]?.id };
  } catch {
    return result;
  }
}

/** Batch: WhatsApp refill_due for programs due this period with phone */
export async function notifyDueRefills(opts: {
  period?: string;
  dry_run?: boolean;
  limit?: number;
}) {
  const d = new Date();
  const period =
    opts.period ||
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const limit = Math.min(opts.limit ?? 50, 200);

  const res = await query<{
    program_id: string;
    program_code: string;
    employee_name: string;
    patient_name: string;
    phone: string | null;
    cycle_status: string | null;
  }>(
    `SELECT
       cp.id AS program_id,
       cp.program_code,
       e.full_name AS employee_name,
       d.full_name AS patient_name,
       e.phone,
       rc.status AS cycle_status
     FROM chronic_programs cp
     JOIN employees e ON e.id = cp.employee_id
     JOIN dependents d ON d.id = cp.dependent_id
     LEFT JOIN refill_cycles rc ON rc.program_id = cp.id AND rc.period = $1
     WHERE cp.status = 'active'
       AND e.phone IS NOT NULL AND trim(e.phone) <> ''
       AND (rc.status IS NULL OR rc.status NOT IN ('dispensed', 'cancelled'))
     ORDER BY e.full_name
     LIMIT $2`,
    [period, limit]
  );

  const results: Array<{
    program_id: string;
    phone: string | null;
    ok: boolean;
    dry_run?: boolean;
    error?: string;
    attempts?: number;
  }> = [];

  for (const row of res.rows) {
    const r = await sendWhatsApp({
      to: row.phone || '',
      template: 'refill_due',
      program_id: row.program_id,
      dry_run: opts.dry_run,
      vars: {
        name: row.employee_name,
        patient: row.patient_name,
        period,
      },
    });
    results.push({
      program_id: row.program_id,
      phone: normalizePhone(row.phone),
      ok: r.ok,
      dry_run: r.dry_run,
      error: r.error,
      attempts: r.attempts,
    });
  }

  return {
    period,
    provider: providerMode(),
    attempted: results.length,
    ok_count: results.filter((x) => x.ok).length,
    results,
  };
}

/**
 * Ops alert: safety queue has Major DDI / High allergy cycles.
 * Sends to SAFETY_WHATSAPP_TO (comma-separated) — NOT to patients.
 */
export async function notifySafetyQueue(opts?: {
  dry_run?: boolean;
  limit?: number;
  force?: boolean;
  app_base_url?: string;
}) {
  const { scanRefillSafetyQueue } = await import('@/lib/refillSafety');
  const scan = await scanRefillSafetyQueue({ limit: opts?.limit ?? 40 });

  if (scan.flagged === 0 && !opts?.force) {
    return {
      skipped: true,
      reason: 'no_flags',
      scanned: scan.scanned,
      flagged: 0,
      sent: [] as SendResult[],
    };
  }

  const raw =
    process.env.SAFETY_WHATSAPP_TO ||
    process.env.WHATSAPP_OPS_PHONE ||
    '';
  const phones = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (phones.length === 0) {
    return {
      skipped: true,
      reason: 'SAFETY_WHATSAPP_TO not set',
      scanned: scan.scanned,
      flagged: scan.flagged,
      sent: [] as SendResult[],
    };
  }

  const top = scan.rows
    .slice(0, 8)
    .map(
      (r) =>
        `• ${r.program_code} ${r.patient_name} (${r.period}): ${r.summary}`
    )
    .join('\n');

  const base =
    opts?.app_base_url ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const link = base ? `${base.replace(/\/$/, '')}/refills/safety` : '/refills/safety';

  const sent: Array<SendResult & { log_id?: string }> = [];
  for (const phone of phones) {
    const r = await sendWhatsApp({
      to: phone,
      template: 'safety_alert',
      dry_run: opts?.dry_run,
      vars: {
        flagged: String(scan.flagged),
        scanned: String(scan.scanned),
        summary: top || 'See safety queue',
        link,
      },
    });
    sent.push(r);
  }

  return {
    skipped: false,
    scanned: scan.scanned,
    flagged: scan.flagged,
    provider: providerMode(),
    recipients: phones.length,
    ok_count: sent.filter((s) => s.ok).length,
    sent,
  };
}

export function whatsappConfigStatus() {
  const mode = providerMode();
  const retry = webhookRetryDefaults();
  return {
    mode,
    dry_run_default: process.env.WHATSAPP_DRY_RUN === '1' || mode === 'none',
    has_meta: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    has_twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    has_webhook: !!process.env.WHATSAPP_WEBHOOK_URL,
    has_safety_to: !!(process.env.SAFETY_WHATSAPP_TO || process.env.WHATSAPP_OPS_PHONE),
    retry: {
      maxAttempts: retry.maxAttempts,
      baseDelayMs: retry.baseDelayMs,
      maxDelayMs: retry.maxDelayMs,
    },
    templates: Object.keys(WA_TEMPLATES),
  };
}
