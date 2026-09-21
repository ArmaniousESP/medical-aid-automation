# WhatsApp notification setup

## Providers (pick one)

### 1. Meta Cloud API
```
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=123456789
```

### 2. Twilio WhatsApp
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 3. Generic webhook (360dialog, etc.)
```
WHATSAPP_WEBHOOK_URL=https://your-gateway/send
```
Body: `{ "to", "body", "channel": "whatsapp", "template", "program_id" }`

## Safety
```
WHATSAPP_DRY_RUN=1   # log only, no provider call
```
Without any provider credentials, all sends are dry-run.

## Templates
- `refill_due` — monthly due reminder
- `refill_ready` — ready for pickup
- `pnat_high_risk` — adherence follow-up
- `care_line_followup` — care line note
- `custom` — free text via `vars.message`

## API
```http
GET  /api/notifications/whatsapp
POST /api/notifications/whatsapp
{ "action": "notify_due", "dry_run": true, "period": "2026-09" }

POST /api/notifications/whatsapp
{ "to": "01012345678", "template": "refill_due",
  "vars": { "name": "…", "patient": "…", "period": "2026-09" } }

GET /api/cron/whatsapp-due?dry_run=1
```

## Meta policy note
Free-form text works inside the 24h customer-care window.
Outside it, register **message templates** in Meta Business Manager and extend
`sendMeta` to use `type: "template"`.

## Cron (GitHub Action example)
Call with header `x-process-secret: $PROCESS_SECRET` on a schedule
(e.g. day 1–3 of each month).
