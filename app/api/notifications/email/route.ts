import { NextRequest, NextResponse } from 'next/server';
import {
  sendEmail,
  isEmailConfigured,
  defaultOpsRecipients,
  processSummaryEmail,
  reviewNeededEmail,
} from '@/lib/email';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: isEmailConfigured(),
    has_key: !!process.env.RESEND_API_KEY,
    has_from: !!process.env.EMAIL_FROM,
    default_to: defaultOpsRecipients(),
    notify_on_process: process.env.EMAIL_NOTIFY_ON_PROCESS === 'true',
  });
}

/**
 * POST /api/notifications/email
 * { type: 'custom' | 'process_summary' | 'review_needed', ... }
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || 'custom';
    const baseUrl =
      body.baseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin;

    if (type === 'process_summary') {
      const tpl = processSummaryEmail({
        message: String(body.message || 'Process completed'),
        newRows: Number(body.newRows) || 0,
        lowMatch: Number(body.lowMatch) || 0,
        ocr_filled: body.ocr_filled,
        ocr_skipped_low_confidence: body.ocr_skipped_low_confidence,
        invoice_validation_fail: body.invoice_validation_fail,
        dryRun: !!body.dryRun,
        baseUrl,
      });
      const result = await sendEmail({
        to: body.to,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      return NextResponse.json({ ok: result.ok, ...result, type });
    }

    if (type === 'review_needed') {
      const tpl = reviewNeededEmail({
        count: Number(body.count) || 0,
        samples: body.samples,
        baseUrl,
      });
      const result = await sendEmail({
        to: body.to,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      return NextResponse.json({ ok: result.ok, ...result, type });
    }

    // custom
    if (!body.subject || (!body.html && !body.text)) {
      return NextResponse.json(
        { ok: false, error: 'subject and html or text required' },
        { status: 400 }
      );
    }
    const result = await sendEmail({
      to: body.to,
      subject: String(body.subject),
      html: body.html ? String(body.html) : undefined,
      text: body.text ? String(body.text) : undefined,
      replyTo: body.replyTo ? String(body.replyTo) : undefined,
    });
    return NextResponse.json({ ok: result.ok, ...result, type: 'custom' });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
