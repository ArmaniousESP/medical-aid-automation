# TPA / eTPA — Chronic medication integration

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/tpa/webhook` | Health check |
| `POST` | `/api/tpa/webhook` | Receive status/dispense events from TPA |
| `POST` | `/api/tpa/refill-preview` | Build a `chronic_refill.request` payload for testing |

## Env

```bash
TPA_WEBHOOK_SECRET=long-random-string
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Webhook clients should send header: `x-webhook-secret: <TPA_WEBHOOK_SECRET>`

## Types

See `lib/tpa/chronic.ts`:

- `ChronicProgramUpsert` — enroll / update chronic program
- `ChronicRefillRequest` — monthly refill
- `ChronicRefillStatusEvent` — webhook body
- `buildRefillFromRows()` — helper from sheet-like rows
- `buildProgramId()` — `CHR-{year}-{employeeId}-{seq}`

## Pilot without API

Use Excel sheets with the same field names as the JSON payloads, then map 1:1 when the partner enables API access.

## Suggested Approved-Requests columns

- `program_id`
- `period` (YYYY-MM)
- `coverage_type`
- `tpa_name`
- `tpa_auth_id`
- `tpa_status`
- `tpa_approved_amount`
- `company_gap_amount`
