import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dryRun;
    const result = await processNewResponses(dryRun);

    let email: { ok: boolean; id?: string; error?: string; skipped?: boolean } | null =
      null;

    const shouldNotify =
      process.env.EMAIL_NOTIFY_ON_PROCESS === 'true' ||
      body.notifyEmail === true;
    const skipDry = dryRun && process.env.EMAIL_NOTIFY_DRY_RUN !== 'true';

    if (shouldNotify && !skipDry) {
      try {
        const { processSummaryEmail, sendEmail, reviewNeededEmail } = await import(
          '@/lib/email'
        );
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const tpl = processSummaryEmail({
          message: result.message,
          newRows: result.newRows,
          lowMatch: result.lowMatch,
          ocr_filled: result.ocr_filled,
          ocr_skipped_low_confidence: result.ocr_skipped_low_confidence,
          invoice_validation_fail: result.invoice_validation_fail,
          dryRun: result.dryRun,
          baseUrl,
        });
        email = await sendEmail({
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        });

        // Extra alert when OCR skipped for confidence
        if (
          (result.ocr_skipped_low_confidence || 0) > 0 &&
          process.env.EMAIL_NOTIFY_REVIEW !== 'false'
        ) {
          const rev = reviewNeededEmail({
            count: result.ocr_skipped_low_confidence || 0,
            samples: (result.warnings || [])
              .filter((w) => w.startsWith('ocr_low_conf:'))
              .slice(0, 8),
            baseUrl,
          });
          await sendEmail({
            subject: rev.subject,
            html: rev.html,
            text: rev.text,
          });
        }
      } catch (e: unknown) {
        email = {
          ok: false,
          error: e instanceof Error ? e.message : 'email failed',
        };
      }
    }

    return NextResponse.json({ ok: true, ...result, email });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
