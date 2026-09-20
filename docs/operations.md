# Operations

## Secrets (GitHub + Vercel)

| Secret / Env | Where | Purpose |
|--------------|--------|--------|
| `DATABASE_URL` | Vercel | Neon pooler |
| `GOOGLE_*` / `GOOGLE_SHEET_ID` | Vercel | Sheets → DB sync |
| `PROCESS_SECRET` | Vercel + GitHub | Protect APIs |
| `CRON_SECRET` | Vercel | Optional; falls back to PROCESS_SECRET |
| `VERCEL_APP_URL` | GitHub Actions | Production app URL (optional default) |

Sheet sync details: **[sheet-sync.md](./sheet-sync.md)**

## Health

```bash
curl "$APP/api/health"
```

UI: `/status`

## Scheduled jobs

### GitHub Actions
| Workflow | When | Action |
|----------|------|--------|
| `sync-sheet-to-db.yml` | Every 6h | Sheet → Neon |
| `process-medical-aid.yml` | Daily 06:00 UTC | Process + sync |
| `generate-refills.yml` | 1st of month | Generate refills |
| `monthly-med-report.yml` | 2nd of month | Report snapshot |
| `deploy-vercel.yml` | Push / manual | Deploy (if secrets set) |

### Vercel Cron
| Path | Schedule |
|------|----------|
| `/api/cron/daily` | `0 6 * * *` |
| `/api/cron/sync-sheet` | `0 */6 * * *` |
| `/api/cron/monthly-refills` | `0 5 1 * *` |
| `/api/cron/monthly-report` | `0 6 2 * *` |

## Pipeline

```
Google Form
  → /api/process  (Approved-Requests rows)
  → /api/cron/sync-sheet  (Neon programs + med lines)
  → /api/refills/generate
  → /pharmacy  → inventory deduct
  → /reports
```

## Manual sheet sync

```bash
curl -X POST "$APP/api/cron/sync-sheet" -H "x-process-secret: $PROCESS_SECRET"
```
