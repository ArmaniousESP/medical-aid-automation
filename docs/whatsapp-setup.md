# WhatsApp Business API (Meta Cloud API)

Primary integration uses the **WhatsApp Business Platform Cloud API** via Meta Graph.

## 1. Meta Business setup

1. Open [Meta for Developers](https://developers.facebook.com/) → create / select an app → add **WhatsApp** product.
2. In **WhatsApp → API Setup**, copy:
   - **Access token** → `WHATSAPP_TOKEN`
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
3. Add a test recipient, or go live with a verified business number.
4. (Production) Create **message templates** in WhatsApp Manager (Arabic), e.g.:
   - `refill_due` — body params: `{{1}}` name, `{{2}}` patient, `{{3}}` period
   - `refill_ready`, `request_received`, `status_update`, `safety_alert`, …
5. Wait until template status is **Approved**.

## 2. Vercel environment variables

```
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_GRAPH_VERSION=v21.0

# Session text only works inside 24h customer-care window.
# Outside that window set template mode:
WHATSAPP_META_TEMPLATE_MODE=1
WA_TEMPLATE_LANG=ar

# Optional overrides if Meta template names differ:
# WA_TEMPLATE_REFILL_DUE=refill_due_ar
# WA_TEMPLATE_REFILL_READY=refill_ready_ar

# Webhook (delivery + inbound)
WHATSAPP_VERIFY_TOKEN=choose-a-long-random-string

# Ops safety alerts (comma-separated Egypt mobiles)
SAFETY_WHATSAPP_TO=2010xxxxxxx,2011xxxxxxx

# Test without sending:
WHATSAPP_DRY_RUN=1
```

Redeploy after saving env vars.

## 3. Webhook callback

In Meta → WhatsApp → Configuration → Webhook:

| Field | Value |
|-------|--------|
| Callback URL | `https://medical-aid-automation.vercel.app/api/webhooks/whatsapp` |
| Verify token | same as `WHATSAPP_VERIFY_TOKEN` |
| Subscribe | `messages` |

The route is public (no ops cookie) so Meta can verify and POST statuses.

## 4. Send modes

| Mode | When |
|------|------|
| **Text** (`type: text`) | Default; OK inside 24h session after user messaged you |
| **Template** (`type: template`) | `WHATSAPP_META_TEMPLATE_MODE=1`; required for business-initiated outreach |

Graph endpoint:

`POST https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages`

## 5. Ops UI

1. Unlock on Home (`PROCESS_SECRET`)
2. **More → Notifications · WhatsApp**
3. Provider mode should show `meta`
4. **Notify due** or **Safety alert** (start with dry-run)

## 6. API

```http
GET  /api/notifications/whatsapp
POST /api/notifications/whatsapp
{ "action": "notify_due", "dry_run": true }

POST /api/notifications/whatsapp
{ "to": "01012345678", "template": "refill_due",
  "vars": { "name": "…", "patient": "…", "period": "2026-10" } }
```

## 7. Alternatives

- **Twilio WhatsApp**: `TWILIO_*` (if Meta vars absent)
- **Generic gateway**: `WHATSAPP_WEBHOOK_URL`

Meta credentials take priority when both are set.
