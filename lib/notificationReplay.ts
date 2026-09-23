/**
 * Replay failed WhatsApp rows from notification_log.
 */

import { query } from '@/lib/db';
import {
  sendWhatsApp,
  type WaTemplateKey,
  WA_TEMPLATES,
} from '@/lib/whatsapp';

export async function listFailedNotifications(limit = 30) {
  const res = await query<{
    id: string;
    template_key: string;
    recipient_phone: string;
    program_id: string | null;
    payload: unknown;
    error: string | null;
    sent_at: string | null;
    created_at?: string;
  }>(
    `SELECT id, template_key, recipient_phone, program_id, payload, error, sent_at
     FROM notification_log
     WHERE status = 'failed' AND channel = 'whatsapp'
     ORDER BY id DESC
     LIMIT $1`,
    [Math.min(limit, 100)]
  ).catch(() => ({ rows: [] as any[] }));

  return res.rows;
}

export async function replayFailedNotifications(opts?: {
  limit?: number;
  dry_run?: boolean;
  ids?: string[];
}) {
  const limit = Math.min(opts?.limit ?? 20, 50);
  let rows: Awaited<ReturnType<typeof listFailedNotifications>>;

  if (opts?.ids?.length) {
    const res = await query(
      `SELECT id, template_key, recipient_phone, program_id, payload, error, sent_at
       FROM notification_log
       WHERE id = ANY($1::uuid[]) AND status = 'failed'`,
      [opts.ids]
    );
    rows = res.rows as any;
  } else {
    rows = await listFailedNotifications(limit);
  }

  const results: Array<{
    id: string;
    ok: boolean;
    dry_run?: boolean;
    error?: string;
    attempts?: number;
  }> = [];

  for (const row of rows) {
    const payload =
      typeof row.payload === 'string'
        ? JSON.parse(row.payload || '{}')
        : (row.payload as any) || {};
    const template = (
      Object.keys(WA_TEMPLATES).includes(row.template_key)
        ? row.template_key
        : 'custom'
    ) as WaTemplateKey;

    const vars =
      payload.vars && typeof payload.vars === 'object'
        ? (payload.vars as Record<string, string>)
        : payload.body
          ? { message: String(payload.body) }
          : {};

    if (template === 'custom' && !vars.message && payload.body) {
      vars.message = String(payload.body);
    }

    const r = await sendWhatsApp({
      to: row.recipient_phone,
      template,
      vars,
      program_id: row.program_id || undefined,
      dry_run: opts?.dry_run,
    });

    // Mark original as replayed when success (keep history; update status)
    if (r.ok && !r.dry_run) {
      try {
        await query(
          `UPDATE notification_log SET status = 'replayed', error = NULL WHERE id = $1`,
          [row.id]
        );
      } catch {
        /* optional */
      }
    }

    results.push({
      id: row.id,
      ok: r.ok,
      dry_run: r.dry_run,
      error: r.error,
      attempts: r.attempts,
    });
  }

  return {
    found: rows.length,
    ok_count: results.filter((x) => x.ok).length,
    results,
  };
}
