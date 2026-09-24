# Claims system

## Purpose

Internal claim ledger for monthly medical aid amounts, with optional push to an external claims/TPA webhook.

## Tables

- `claims` — header (status, totals, program/intake links, `error_log` JSONB)
- `claim_lines` — med lines with qty and EGP amounts

## API

```http
GET  /api/claims?status=draft
GET  /api/claims?id=<uuid>
POST /api/claims  { "action": "create", "lines": [...], "aid_request_id": "..." }
POST /api/claims  { "action": "set_status", "id": "...", "status": "approved" }
POST /api/claims  { "action": "submit", "id": "..." }
```

Statuses: `draft` → `submitted` → `under_review` → `approved` | `paid` | `rejected`

## Auto from intake

```bash
AUTO_CLAIM_ON_ENROLL=true   # draft claim after process-intake enroll
AUTO_CLAIM_SUBMIT=true      # also POST to webhook
CLAIMS_WEBHOOK_URL=https://your-tpa.example/hooks/claims
CLAIMS_WEBHOOK_SECRET=...
```

Webhook payload:

```json
{
  "event": "claim.submitted",
  "claim": { },
  "lines": [ ]
}
```

Failures append to `claims.error_log` with step, HTTP status, and message.

## UI

`/claims` — list, filter by status, submit drafts.
