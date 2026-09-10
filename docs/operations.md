# Operations

## Secrets (GitHub + Vercel)

| Secret / Env | Where | Purpose |
|--------------|--------|--------|
| `DATABASE_URL` | Vercel | Neon pooler |
| `GOOGLE_*` / `GOOGLE_SHEET_ID` | Vercel | Sheets + MEDDB3 |
| `PROCESS_SECRET` | Vercel + GitHub | Protect APIs |
| `VERCEL_APP_URL` | GitHub Actions | Production app URL |
| `AUTO_ENROLL_CHRONIC` | Vercel | Default on; set `false` to disable auto enroll |

## Scheduled jobs

| Workflow | When | Action |
|----------|------|--------|
| `process-medical-aid.yml` | Daily 06:00 UTC | Process form → sheet, then `sync-from-sheet` |
| `generate-refills.yml` | 1st of month 05:00 UTC | Generate monthly refill cycles |

## Pipeline

```
Google Form
  → /api/process  (match, price, append Approved-Requests)
  → /api/programs/sync-from-sheet  (group by employee+patient → Neon programs)
  → /api/refills/generate  (monthly)
  → /refills UI  (review → dispense)
```

## Sync Approved-Requests → chronic programs

Runs automatically after process when `DATABASE_URL` is set.

Manual full resync:

```bash
curl -X POST "$APP/api/programs/sync-from-sheet" \
  -H "x-process-secret: $PROCESS_SECRET"
```

Behaviour:
- Group sheet rows by employee id + patient name
- Create active program if none exists
- Otherwise add only **missing** medication lines
- Attach roshetta URL from Notes when present

## Enroll one program (manual)

```bash
curl -X POST "$APP/api/programs/enroll" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{
    "externalEmployeeId": "11610",
    "employeeName": "سمير مكاري سعد نصرالله",
    "patientName": "مسعودة سعيد نصرالله",
    "relation": "spouse",
    "meds": [
      {
        "requestedName": "Blokatens 5/160",
        "companyPreferred": true,
        "formularyFlag": "EVA_PREFERRED"
      }
    ]
  }'
```

## UI

- `/` — process form + **مزامنة البرامج المزمنة**
- `/refills` — generate month + review queue
- `/refills/[id]` — decide items + dispense
