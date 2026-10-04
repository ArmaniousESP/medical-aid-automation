# WhatsApp setup (Meta Cloud API + Twilio)

Providers (pick one, or set `WHATSAPP_PROVIDER=meta|twilio|webhook`):

1. **Meta Cloud API** (default if both configured)
2. **Twilio WhatsApp**
3. Generic `WHATSAPP_WEBHOOK_URL`

---

## A. Twilio WhatsApp

### 1. Twilio Console

1. [twilio.com/console](https://www.twilio.com/console) → copy **Account SID** + **Auth Token**
2. Enable **WhatsApp** (Sandbox for test, or approved sender for production)
3. Sandbox: join with the code Twilio shows, then use `whatsapp:+14155238886` as From
4. Production: register a WhatsApp Business sender; optional **Messaging Service** (MG…)

### 2. Vercel env

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# or Messaging Service instead of From:
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx

# Force Twilio even if Meta vars also exist:
WHATSAPP_PROVIDER=twilio

# Optional status callbacks:
TWILIO_STATUS_CALLBACK_URL=https://medical-aid-automation.vercel.app/api/webhooks/twilio/whatsapp

# Content API templates (outside 24h window):
TWILIO_CONTENT_TEMPLATE_MODE=1
TWILIO_CONTENT_REFILL_DUE=HXxxxxxxxx
TWILIO_CONTENT_REFILL_READY=HXxxxxxxxx
TWILIO_CONTENT_REQUEST_RECEIVED=HXxxxxxxxx
TWILIO_CONTENT_STATUS_UPDATE=HXxxxxxxxx
TWILIO_CONTENT_SAFETY_ALERT=HXxxxxxxxx

SAFETY_WHATSAPP_TO=2010xxxxxxx
WHATSAPP_DRY_RUN=1
```

Redeploy after saving.

### 3. Content templates

In Twilio **Content Template Builder**, create WhatsApp templates with body variables `{{1}}`, `{{2}}`, … matching:

| Key | Variables |
|-----|-----------|
| refill_due | name, patient, period |
| refill_ready | name, patient, claim |
| request_received | name, patient, request_id |
| status_update | name, request_id, status, note |
| safety_alert | flagged, scanned, summary, link |

Map each approved template SID → `TWILIO_CONTENT_<KEY>`.

### 4. Status webhook

Public URL (no ops cookie):

`https://medical-aid-automation.vercel.app/api/webhooks/twilio/whatsapp`

Set as `TWILIO_STATUS_CALLBACK_URL` (also applied automatically on each send when set).

### 5. Test

1. Unlock → **More → Notifications**
2. Mode should show `twilio`
3. **Notify due** with dry-run first, then live

---

## B. Meta Cloud API

1. [Meta for Developers](https://developers.facebook.com/) → WhatsApp product
2. Env: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
3. Optional: `WHATSAPP_META_TEMPLATE_MODE=1`, `WA_TEMPLATE_LANG=ar`
4. Webhook: `/api/webhooks/whatsapp` + `WHATSAPP_VERIFY_TOKEN`

---

## Ops UI & API

- UI: Unlock → **Notifications · WhatsApp**
- `GET /api/notifications/whatsapp` — provider status
- `POST /api/notifications/whatsapp` `{ "action": "notify_due", "dry_run": true }`
- `POST /api/notifications/whatsapp` `{ "to": "010…", "template": "refill_due", "vars": { … } }`

Without credentials, all sends are **dry-run** (logged only).
