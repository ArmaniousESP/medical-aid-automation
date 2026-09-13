# Operations

## Secrets (GitHub + Vercel)

| Secret / Env | Where | Purpose |
|--------------|--------|--------|
| `DATABASE_URL` | Vercel | Neon pooler |
| `GOOGLE_*` / `GOOGLE_SHEET_ID` | Vercel | Sheets + MEDDB3 |
| `PROCESS_SECRET` | Vercel + GitHub | Protect APIs |
| `CRON_SECRET` | Vercel | Optional; falls back to PROCESS_SECRET for crons |
| `VERCEL_APP_URL` | GitHub Actions | Production app URL |
| `AUTO_ENROLL_CHRONIC` | Vercel | Default on; set `false` to disable auto enroll |

## Health

```bash
curl "$APP/api/health"
```

UI: `/status`

## Scheduled jobs

### GitHub Actions
| Workflow | When | Action |
|----------|------|--------|
| `process-medical-aid.yml` | Daily 06:00 UTC | Process + sync-from-sheet |
| `generate-refills.yml` | 1st of month 05:00 UTC | Generate refills |

### Vercel Cron (`vercel.json`)
| Path | Schedule |
|------|----------|
| `/api/cron/daily` | `0 6 * * *` |
| `/api/cron/monthly-refills` | `0 5 1 * *` |

Auth for cron routes: `Authorization: Bearer $CRON_SECRET` or `x-process-secret`.

You can keep **either** GitHub Actions **or** Vercel Cron (or both with idempotent APIs).

## Pipeline

```
Google Form
  → /api/process  (match, price, append Approved-Requests)
  → /api/programs/sync-from-sheet  (employee+patient → Neon programs)
  → /api/refills/generate  (monthly)
  → /refills UI  (review → dispense)
  → /reports  (monthly summary + CSV)
```

## Sync Approved-Requests → chronic programs

```bash
curl -X POST "$APP/api/programs/sync-from-sheet" \
  -H "x-process-secret: $PROCESS_SECRET"
```

## UI

- `/` — process form + sync programs
- `/programs` — chronic programs list
- `/refills` — generate month + review
- `/refills/[id]` — decide + dispense
- `/reports` — monthly report + CSV
- `/status` — health checks
