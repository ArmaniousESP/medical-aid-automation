/**
 * WhatsApp Business Platform — Cloud API (Meta Graph).
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages
 */

import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';
import type { SendResult, WaTemplateKey } from '@/lib/whatsapp';

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

export function metaCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Prefer approved templates outside the 24h session window */
export function metaUseApprovedTemplates(): boolean {
  return (
    process.env.WHATSAPP_META_TEMPLATE_MODE === '1' ||
    process.env.WA_USE_APPROVED_TEMPLATES === '1'
  );
}

/** Map our internal key → template name registered in Meta Business Manager */
export function metaTemplateName(key: WaTemplateKey): string {
  const envKey = `WA_TEMPLATE_${key.toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  // defaults: register templates with these names in Meta, or set env overrides
  const defaults: Partial<Record<WaTemplateKey, string>> = {
    refill_due: 'refill_due',
    refill_ready: 'refill_ready',
    request_received: 'request_received',
    status_update: 'status_update',
    pnat_high_risk: 'pnat_high_risk',
    care_line_followup: 'care_line_followup',
    safety_alert: 'safety_alert',
  };
  return defaults[key] || key;
}

export function metaTemplateLang(): string {
  return process.env.WA_TEMPLATE_LANG || process.env.WHATSAPP_TEMPLATE_LANG || 'ar';
}

/** Ordered body parameter texts for approved templates */
export function metaTemplateBodyParams(
  key: WaTemplateKey,
  vars: Record<string, string>
): string[] {
  switch (key) {
    case 'refill_due':
      return [vars.name || '', vars.patient || '', vars.period || ''];
    case 'refill_ready':
      return [vars.name || '', vars.patient || '', vars.claim || ''];
    case 'request_received':
      return [vars.name || '', vars.patient || '', vars.request_id || ''];
    case 'status_update':
      return [vars.name || '', vars.request_id || '', vars.status || '', vars.note || ''];
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
}

export async function sendMetaCloudText(
  to: string,
  body: string
): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const retry = webhookRetryDefaults();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body },
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
          data?.error?.error_user_msg ||
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

export async function sendMetaCloudTemplate(
  to: string,
  templateKey: WaTemplateKey,
  vars: Record<string, string>,
  fallbackBody: string
): Promise<SendResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const retry = webhookRetryDefaults();
  const name = metaTemplateName(templateKey);
  const language = metaTemplateLang();
  const params = metaTemplateBodyParams(templateKey, vars).map((text) => ({
    type: 'text' as const,
    text: text || '—',
  }));

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name,
      language: { code: language },
      components:
        params.length > 0
          ? [{ type: 'body', parameters: params }]
          : [],
    },
  };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      retry
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        provider: 'meta_template',
        error:
          data?.error?.message ||
          data?.error?.error_user_msg ||
          JSON.stringify(data) ||
          errors.join('; '),
        to,
        body: fallbackBody,
        attempts,
      };
    }
    return {
      ok: true,
      provider: 'meta_template',
      message_id: data?.messages?.[0]?.id,
      to,
      body: fallbackBody,
      attempts,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      provider: 'meta_template',
      error: e instanceof Error ? e.message : 'meta template failed',
      to,
      body: fallbackBody,
      attempts: retry.maxAttempts,
    };
  }
}

/** Send via Cloud API: approved template mode or session text */
export async function sendViaMetaCloud(opts: {
  to: string;
  template: WaTemplateKey;
  vars: Record<string, string>;
  body: string;
}): Promise<SendResult> {
  if (metaUseApprovedTemplates() && opts.template !== 'custom') {
    return sendMetaCloudTemplate(
      opts.to,
      opts.template,
      opts.vars,
      opts.body
    );
  }
  return sendMetaCloudText(opts.to, opts.body);
}

export function metaCloudStatus() {
  return {
    configured: metaCloudConfigured(),
    graph_version: GRAPH_VERSION,
    phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
      ? `${String(process.env.WHATSAPP_PHONE_NUMBER_ID).slice(0, 4)}…`
      : null,
    template_mode: metaUseApprovedTemplates(),
    template_lang: metaTemplateLang(),
    webhook_verify_token_set: !!process.env.WHATSAPP_VERIFY_TOKEN,
  };
}
