# TPA Pilot pack

Manual + API-ready files for chronic monthly medication programs.

## CSV sheets

| File | Use |
|------|-----|
| `chronic_programs.csv` | One row per patient chronic program |
| `chronic_meds.csv` | Medication lines linked by `program_id` |
| `monthly_refills.csv` | What to send each month |
| `tpa_responses.csv` | Fill after partner approves/rejects |

## JSON fixtures

| File | Use |
|------|-----|
| `sample-refill-preview.json` | Body for `POST /api/tpa/refill-preview` |
| `sample-webhook-status.json` | Body for `POST /api/tpa/webhook` |

## Local test after deploy

```bash
# 1) Build payload
curl -s -X POST "$APP_URL/api/tpa/refill-preview" \
  -H 'Content-Type: application/json' \
  -d @docs/tpa-pilot/sample-refill-preview.json | jq

# 2) Simulate TPA callback
curl -s -X POST "$APP_URL/api/tpa/webhook" \
  -H 'Content-Type: application/json' \
  -H "x-webhook-secret: $TPA_WEBHOOK_SECRET" \
  -d @docs/tpa-pilot/sample-webhook-status.json | jq
```

Replace EXAMPLE drive links and prices before sharing with a partner.
