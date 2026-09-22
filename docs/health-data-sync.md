# Automated health data sync

## Pipeline

```
Google Form responses
  → processNewResponses (expand, match EVA, prices, Approved-Requests)
  → syncApprovedToPrograms (employee + patient → chronic_programs + med lines + roshetta)
  → health_sync_runs log
```

## Triggers

| Source | Schedule | Endpoint |
|--------|----------|----------|
| Vercel Cron | every 6h at :30 | `GET/POST /api/cron/health-sync` |
| Vercel Cron | daily 06:00 UTC | `/api/cron/daily` (process + sync) |
| Vercel Cron | every 6h at :00 | `/api/cron/sync-sheet` (programs only) |
| GitHub Action | every 6h at :15 | `health-data-sync.yml` |
| UI | manual | `/health-sync` → `POST /api/health-sync` |

## Required Vercel env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sheet access |
| `GOOGLE_PRIVATE_KEY` | Sheet access |
| `GOOGLE_SHEET_ID` | استمارة 9 responses workbook |
| `PROCESS_SECRET` or `CRON_SECRET` | Protect cron + UI POST |

Share the sheet with the service account email (Viewer or Editor).

## Manual test

```bash
curl -X POST "https://medical-aid-automation.vercel.app/api/cron/health-sync" \
  -H "x-process-secret: $PROCESS_SECRET"
```

UI: https://medical-aid-automation.vercel.app/health-sync
