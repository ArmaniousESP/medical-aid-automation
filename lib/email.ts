/**
 * Outbound email via Resend REST API (no SDK required).
 * Env:
 *   RESEND_API_KEY
 *   EMAIL_FROM  e.g. "Medical Aid <ops@yourdomain.com>"
 *   EMAIL_TO    comma-separated ops recipients (default notify list)
 *   EMAIL_NOTIFY_ON_PROCESS=true  auto-send after process
 */

import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

export type EmailPayload = {
  to?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

export type EmailSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
  attempts?: number;
  skipped?: boolean;
};

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

export function defaultOpsRecipients(): string[] {
  return parseList(process.env.EMAIL_TO || process.env.OPS_EMAIL);
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, skipped: true, error: 'EMAIL_FROM not set' };
  }

  const toList = payload.to
    ? Array.isArray(payload.to)
      ? payload.to
      : parseList(payload.to)
    : defaultOpsRecipients();

  if (!toList.length) {
    return { ok: false, skipped: true, error: 'No recipients (EMAIL_TO or payload.to)' };
  }

  const body = {
    from,
    to: toList,
    subject: payload.subject,
    html: payload.html || undefined,
    text: payload.text || undefined,
    reply_to: payload.replyTo || process.env.EMAIL_REPLY_TO || undefined,
  };

  try {
    const { response, attempts, errors } = await fetchWithRetry(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      webhookRetryDefaults()
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        attempts,
        error:
          (data as any)?.message ||
          (data as any)?.error ||
          errors.join('; ') ||
          `HTTP ${response.status}`,
      };
    }
    return { ok: true, id: (data as any)?.id, attempts };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'send failed',
    };
  }
}

/** Build process-summary email body */
export function processSummaryEmail(input: {
  message: string;
  newRows: number;
  lowMatch: number;
  ocr_filled?: number;
  ocr_skipped_low_confidence?: number;
  invoice_validation_fail?: number;
  dryRun?: boolean;
  baseUrl?: string;
}): { subject: string; html: string; text: string } {
  const base = input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';
  const subject = input.dryRun
    ? `[Dry run] Medical aid process — ${input.newRows} new`
    : `[Process] Medical aid — ${input.newRows} new · ${input.lowMatch} low match`;

  const lines = [
    input.message,
    '',
    `New rows: ${input.newRows}`,
    `Low match: ${input.lowMatch}`,
    input.ocr_filled != null ? `OCR filled: ${input.ocr_filled}` : null,
    input.ocr_skipped_low_confidence
      ? `OCR skipped (low confidence): ${input.ocr_skipped_low_confidence}`
      : null,
    input.invoice_validation_fail
      ? `Invoice validation not-pass: ${input.invoice_validation_fail}`
      : null,
    '',
    base ? `Review queue: ${base}/review` : 'Review queue: /review',
    base ? `OCR: ${base}/ocr` : 'OCR: /ocr',
    base ? `Home: ${base}/` : '',
  ].filter(Boolean) as string[];

  const text = lines.join('\n');
  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
      <h2 style="margin:0 0 12px">Medical aid process</h2>
      <p>${escapeHtml(input.message)}</p>
      <ul>
        <li>New rows: <strong>${input.newRows}</strong></li>
        <li>Low match: <strong>${input.lowMatch}</strong></li>
        ${input.ocr_filled != null ? `<li>OCR filled: ${input.ocr_filled}</li>` : ''}
        ${input.ocr_skipped_low_confidence ? `<li>OCR skipped (low conf): <strong>${input.ocr_skipped_low_confidence}</strong></li>` : ''}
        ${input.invoice_validation_fail ? `<li>Invoice not-pass: ${input.invoice_validation_fail}</li>` : ''}
      </ul>
      ${base ? `<p><a href="${base}/review">Open review queue</a> · <a href="${base}/ocr">OCR</a></p>` : ''}
      <p style="color:#64748b;font-size:12px">Ops notification — not a clinical decision.</p>
    </div>`;

  return { subject, html, text };
}

export function reviewNeededEmail(input: {
  count: number;
  samples?: string[];
  baseUrl?: string;
}): { subject: string; html: string; text: string } {
  const base = input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';
  const subject = `[Review] ${input.count} form OCR item(s) need attention`;
  const sampleBlock = (input.samples || []).slice(0, 8).join('\n');
  const text = [
    `${input.count} attachment(s) need staff review (low confidence or invoice fail).`,
    sampleBlock,
    base ? `Open: ${base}/review` : '/review',
  ].join('\n\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
      <h2 style="margin:0 0 12px">OCR review needed</h2>
      <p><strong>${input.count}</strong> item(s) need staff confirmation.</p>
      ${sampleBlock ? `<pre style="background:#f8fafc;padding:8px;border-radius:6px;font-size:12px">${escapeHtml(sampleBlock)}</pre>` : ''}
      ${base ? `<p><a href="${base}/review">Open review queue</a></p>` : ''}
    </div>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
