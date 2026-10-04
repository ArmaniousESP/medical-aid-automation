import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Twilio Message status callback for WhatsApp.
 * Set TWILIO_STATUS_CALLBACK_URL to:
 *   https://medical-aid-automation.vercel.app/api/webhooks/twilio/whatsapp
 *
 * @see https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const messageSid = String(form.get('MessageSid') || form.get('SmsSid') || '');
    const status = String(form.get('MessageStatus') || form.get('SmsStatus') || '');
    const to = String(form.get('To') || '').replace(/^whatsapp:/, '');
    const errorCode = form.get('ErrorCode');
    const errorMessage = form.get('ErrorMessage');

    try {
      await query(
        `INSERT INTO notification_log (
           channel, template_key, recipient_phone, payload, status, provider_response, error, sent_at
         ) VALUES (
           'twilio_status', $1, $2, $3::jsonb, $4, $5, $6, now()
         )`,
        [
          status || 'unknown',
          to || null,
          JSON.stringify({
            message_sid: messageSid,
            error_code: errorCode ? String(errorCode) : null,
            error_message: errorMessage ? String(errorMessage) : null,
          }),
          status === 'failed' || status === 'undelivered' ? 'failed' : 'status',
          messageSid || null,
          errorMessage ? String(errorMessage) : null,
        ]
      );
    } catch {
      /* table optional */
    }
  } catch (e) {
    console.error('[twilio webhook]', e);
  }

  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: 'POST status callbacks from Twilio here',
  });
}
