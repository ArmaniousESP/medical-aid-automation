/**
 * Twilio API for WhatsApp
 * @see https://www.twilio.com/docs/whatsapp
 *
 * Session body messages work inside the 24h window.
 * Outside it, use Content API templates (ContentSid + ContentVariables).
 */

import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';
import type { SendResult, WaTemplateKey } from '@/lib/whatsapp';

export function twilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

export function twilioUseContentTemplates(): boolean {
  return (
    process.env.TWILIO_CONTENT_TEMPLATE_MODE === '1' ||
    process.env.WA_USE_TWILIO_CONTENT === '1'
  );
}

/** Map internal template key → Twilio Content SID (HX…) */
export function twilioContentSid(key: WaTemplateKey): string | null {
  const envKey = `TWILIO_CONTENT_${key.toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

/** ContentVariables keys "1","2",… matching Content Template Builder body vars */
export function twilioContentVariables(
  key: WaTemplateKey,
  vars: Record<string, string>
): Record<string, string> {
  const values: string[] = (() => {
    switch (key) {
      case 'refill_due':
        return [vars.name || '', vars.patient || '', vars.period || ''];
      case 'refill_ready':
        return [vars.name || '', vars.patient || '', vars.claim || ''];
      case 'request_received':
        return [vars.name || '', vars.patient || '', vars.request_id || ''];
      case 'status_update':
        return [
          vars.name || '',
          vars.request_id || '',
          vars.status || '',
          vars.note || '',
        ];
      case 'pnat_high_risk':
        return [vars.name || '', vars.patient || ''];
      case 'care_line_followup':
        return [vars.name || '', vars.patient || '', vars.note || ''];
      case 'safety_alert':
        return [
          vars.flagged || '0',
          vars.scanned || '0',
          (vars.summary || '').slice(0, 200),
          vars.link || '',
        ];
      case 'custom':
        return [vars.message || ''];
      default:
        return Object.values(vars).filter(Boolean);
    }
  })();
  const out: Record<string, string> = {};
  values.forEach((v, i) => {
    out[String(i + 1)] = v || '—';
  });
  return out;
}

function formatWhatsAppAddress(raw: string): string {
  const d = raw.replace(/\D/g, '');
  const e164 = d.startsWith('+') ? raw : `+${d}`;
  if (raw.startsWith('whatsapp:')) return raw;
  return `whatsapp:${e164.startsWith('+') ? e164 : '+' + d}`;
}

function fromAddress(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM || '';
  if (!from) return '';
  return from.startsWith('whatsapp:') ? from : `whatsapp:${from.replace(/^whatsapp:/, '')}`;
}

export async function sendTwilioBody(
  to: string,
  body: string
): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = fromAddress();
  const toWa = formatWhatsAppAddress(to);
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: toWa, Body: body });
  if (messagingService) {
    params.set('MessagingServiceSid', messagingService);
  } else if (from) {
    params.set('From', from);
  } else {
    return {
      ok: false,
      provider: 'twilio',
      error: 'Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID',
      to,
      body,
    };
  }

  const statusCb = process.env.TWILIO_STATUS_CALLBACK_URL;
  if (statusCb) params.set('StatusCallback', statusCb);

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
        error:
          data?.message ||
          data?.error_message ||
          JSON.stringify(data) ||
          errors.join('; '),
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

/** Content API — approved WhatsApp templates via ContentSid */
export async function sendTwilioContent(
  to: string,
  templateKey: WaTemplateKey,
  vars: Record<string, string>,
  fallbackBody: string
): Promise<SendResult> {
  const contentSid = twilioContentSid(templateKey);
  if (!contentSid) {
    return {
      ok: false,
      provider: 'twilio_content',
      error: `Missing TWILIO_CONTENT_${templateKey.toUpperCase()} (Content SID HX…)`,
      to,
      body: fallbackBody,
    };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = fromAddress();
  const toWa = formatWhatsAppAddress(to);
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const contentVars = JSON.stringify(twilioContentVariables(templateKey, vars));

  const params = new URLSearchParams({
    To: toWa,
    ContentSid: contentSid,
    ContentVariables: contentVars,
  });
  if (messagingService) {
    params.set('MessagingServiceSid', messagingService);
  } else if (from) {
    params.set('From', from);
  } else {
    return {
      ok: false,
      provider: 'twilio_content',
      error: 'Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID',
      to,
      body: fallbackBody,
    };
  }

  const statusCb = process.env.TWILIO_STATUS_CALLBACK_URL;
  if (statusCb) params.set('StatusCallback', statusCb);

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
        provider: 'twilio_content',
        error:
          data?.message ||
          data?.error_message ||
          JSON.stringify(data) ||
          errors.join('; '),
        to,
        body: fallbackBody,
        attempts,
      };
    }
    return {
      ok: true,
      provider: 'twilio_content',
      message_id: data?.sid,
      to,
      body: fallbackBody,
      attempts,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'twilio_content',
      error: e instanceof Error ? e.message : 'twilio content failed',
      to,
      body: fallbackBody,
      attempts: retry.maxAttempts,
    };
  }
}

export async function sendViaTwilio(opts: {
  to: string;
  template: WaTemplateKey;
  vars: Record<string, string>;
  body: string;
}): Promise<SendResult> {
  if (twilioUseContentTemplates() && opts.template !== 'custom') {
    const r = await sendTwilioContent(
      opts.to,
      opts.template,
      opts.vars,
      opts.body
    );
    // Fall back to body if content SID missing (dev convenience)
    if (!r.ok && r.error?.includes('Missing TWILIO_CONTENT_')) {
      return sendTwilioBody(opts.to, opts.body);
    }
    return r;
  }
  return sendTwilioBody(opts.to, opts.body);
}

export function twilioStatus() {
  return {
    configured: twilioConfigured(),
    content_template_mode: twilioUseContentTemplates(),
    has_from: !!process.env.TWILIO_WHATSAPP_FROM,
    has_messaging_service: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
    has_status_callback: !!process.env.TWILIO_STATUS_CALLBACK_URL,
    account_sid_prefix: process.env.TWILIO_ACCOUNT_SID
      ? String(process.env.TWILIO_ACCOUNT_SID).slice(0, 6) + '…'
      : null,
  };
}
