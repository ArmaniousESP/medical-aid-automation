import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Meta WhatsApp Cloud API webhook.
 * Configure callback URL:
 *   https://medical-aid-automation.vercel.app/api/webhooks/whatsapp
 * Verify token = WHATSAPP_VERIFY_TOKEN on Vercel.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 */

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { ok: false, error: 'Verification failed' },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Always 200 quickly so Meta does not retry aggressively
  try {
    await logInbound(body);
  } catch (e) {
    console.error('[whatsapp webhook]', e);
  }

  return NextResponse.json({ ok: true });
}

async function logInbound(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          messaging_product?: string;
          metadata?: { phone_number_id?: string; display_phone_number?: string };
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            recipient_id?: string;
            errors?: unknown[];
          }>;
          messages?: Array<{
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  if (p?.object !== 'whatsapp_business_account') return;

  for (const entry of p.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      for (const st of value.statuses || []) {
        try {
          await query(
            `INSERT INTO notification_log (
               channel, template_key, recipient_phone, payload, status, provider_response, sent_at
             ) VALUES (
               'whatsapp_status', $1, $2, $3::jsonb, $4, $5, now()
             )`,
            [
              st.status || 'unknown',
              st.recipient_id || null,
              JSON.stringify({
                wamid: st.id,
                errors: st.errors,
                phone_number_id: value.metadata?.phone_number_id,
              }),
              st.status === 'failed' ? 'failed' : 'status',
              st.id || null,
            ]
          );
        } catch {
          /* table may not exist yet — ignore */
        }
      }

      for (const msg of value.messages || []) {
        try {
          await query(
            `INSERT INTO notification_log (
               channel, template_key, recipient_phone, payload, status, provider_response, sent_at
             ) VALUES (
               'whatsapp_inbound', $1, $2, $3::jsonb, 'received', $4, now()
             )`,
            [
              msg.type || 'text',
              msg.from || null,
              JSON.stringify({
                text: msg.text?.body,
                wamid: msg.id,
                ts: msg.timestamp,
              }),
              msg.id || null,
            ]
          );
        } catch {
          /* ignore */
        }
      }
    }
  }
}
