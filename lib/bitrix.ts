/**
 * Optional Bitrix24 outbound bridge.
 * Platform (Neon) stays system of record — Bitrix only gets office tasks/CRM deals.
 *
 * Setup: Bitrix24 → Developer resources → Other → Inbound webhook
 * Scopes: crm, task
 * Copy URL into BITRIX24_WEBHOOK_URL (ends with /)
 *
 * Enable: BITRIX_SYNC_ON_INTAKE=1
 */

import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

export function bitrixConfigured(): boolean {
  const url = process.env.BITRIX24_WEBHOOK_URL?.trim();
  return !!url && url.startsWith('http');
}

export function bitrixSyncOnIntake(): boolean {
  return process.env.BITRIX_SYNC_ON_INTAKE === '1' && bitrixConfigured();
}

function webhookBase(): string {
  const u = process.env.BITRIX24_WEBHOOK_URL!.trim();
  return u.endsWith('/') ? u : `${u}/`;
}

async function bitrixMethod(
  method: string,
  fields: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const retry = webhookRetryDefaults();
  try {
    const { response, attempts, errors } = await fetchWithRetry(
      `${webhookBase()}${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      },
      retry
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      return {
        ok: false,
        error:
          data.error_description ||
          data.error ||
          errors.join('; ') ||
          `HTTP ${response.status} after ${attempts} attempts`,
      };
    }
    return { ok: true, result: data.result };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'bitrix fetch failed',
    };
  }
}

export type AidRequestBitrixPayload = {
  id: string;
  emp_name: string;
  patient_name?: string;
  phone?: string;
  company?: string;
  city?: string;
  meds_summary?: string;
};

/** Create a Bitrix task for staff to process the request in the platform. */
export async function createBitrixTaskForRequest(
  req: AidRequestBitrixPayload
): Promise<{ ok: boolean; task_id?: number; error?: string }> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const link = base
    ? `${base.replace(/\/$/, '')}/intake-ops`
    : '/intake-ops';

  const title = `Aid request ${req.id.slice(0, 8)} — ${req.emp_name || 'beneficiary'}`;
  const description = [
    `Platform request ID: ${req.id}`,
    req.patient_name ? `Patient: ${req.patient_name}` : null,
    req.phone ? `Phone: ${req.phone}` : null,
    req.company ? `Company: ${req.company}` : null,
    req.city ? `City: ${req.city}` : null,
    req.meds_summary ? `Meds: ${req.meds_summary}` : null,
    '',
    `Open queue: ${link}`,
    'Source of truth: Medical Aid platform (Neon) — do not process only in Bitrix.',
  ]
    .filter((x) => x != null)
    .join('\n');

  const fields: Record<string, unknown> = {
    fields: {
      TITLE: title,
      DESCRIPTION: description,
      PRIORITY: '1',
      ...(process.env.BITRIX_TASK_RESPONSIBLE_ID
        ? { RESPONSIBLE_ID: Number(process.env.BITRIX_TASK_RESPONSIBLE_ID) }
        : {}),
      ...(process.env.BITRIX_TASK_GROUP_ID
        ? { GROUP_ID: Number(process.env.BITRIX_TASK_GROUP_ID) }
        : {}),
    },
  };

  const r = await bitrixMethod('tasks.task.add', fields);
  if (!r.ok) return { ok: false, error: r.error };
  const taskId =
    typeof r.result === 'object' &&
    r.result &&
    'task' in (r.result as object)
      ? Number((r.result as { task?: { id?: string } }).task?.id)
      : Number(r.result);
  return {
    ok: true,
    task_id: Number.isFinite(taskId) ? taskId : undefined,
  };
}

/** Optional CRM deal in a dedicated funnel (BITRIX_DEAL_CATEGORY_ID). */
export async function createBitrixDealForRequest(
  req: AidRequestBitrixPayload
): Promise<{ ok: boolean; deal_id?: number; error?: string }> {
  const categoryId = process.env.BITRIX_DEAL_CATEGORY_ID;
  if (!categoryId) {
    return { ok: false, error: 'BITRIX_DEAL_CATEGORY_ID not set' };
  }

  const title = `Aid · ${req.emp_name || req.id} · ${req.patient_name || ''}`;
  const r = await bitrixMethod('crm.deal.add', {
    fields: {
      TITLE: title.trim(),
      CATEGORY_ID: Number(categoryId),
      COMMENTS: [
        `Request ID: ${req.id}`,
        req.phone ? `Phone: ${req.phone}` : null,
        req.meds_summary ? `Meds: ${req.meds_summary}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      ...(req.phone ? { PHONE: [{ VALUE: req.phone, VALUE_TYPE: 'WORK' }] } : {}),
    },
  });
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    deal_id: typeof r.result === 'number' ? r.result : Number(r.result),
  };
}

/**
 * Fire-and-forget style sync used from intake.
 * Default: create task. Set BITRIX_CREATE_DEAL=1 to also create a deal.
 */
export async function syncAidRequestToBitrix(
  req: AidRequestBitrixPayload
): Promise<{
  attempted: boolean;
  task?: { ok: boolean; task_id?: number; error?: string };
  deal?: { ok: boolean; deal_id?: number; error?: string };
}> {
  if (!bitrixSyncOnIntake()) {
    return { attempted: false };
  }

  const task = await createBitrixTaskForRequest(req);
  let deal: { ok: boolean; deal_id?: number; error?: string } | undefined;
  if (process.env.BITRIX_CREATE_DEAL === '1') {
    deal = await createBitrixDealForRequest(req);
  }
  return { attempted: true, task, deal };
}

export function bitrixConfigStatus() {
  return {
    configured: bitrixConfigured(),
    sync_on_intake: bitrixSyncOnIntake(),
    create_deal: process.env.BITRIX_CREATE_DEAL === '1',
    has_category: !!process.env.BITRIX_DEAL_CATEGORY_ID,
    has_responsible: !!process.env.BITRIX_TASK_RESPONSIBLE_ID,
    has_group: !!process.env.BITRIX_TASK_GROUP_ID,
  };
}
