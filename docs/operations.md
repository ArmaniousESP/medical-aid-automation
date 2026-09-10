# Operations

## Secrets (GitHub + Vercel)

| Secret | Where | Purpose |
|--------|--------|--------|
| `DATABASE_URL` | Vercel | Neon pooler connection |
| `GOOGLE_*` / `GOOGLE_SHEET_ID` | Vercel + GH | Sheets + MEDDB3 |
| `PROCESS_SECRET` | both | Protect process / generate / enroll |
| `VERCEL_APP_URL` | GitHub Actions | e.g. `https://xxx.vercel.app` |

## Scheduled jobs

| Workflow | When | Action |
|----------|------|--------|
| `process-medical-aid.yml` | Daily 06:00 UTC | Process form → Approved-Requests |
| `generate-refills.yml` | 1st of month 05:00 UTC | `POST /api/refills/generate` |

Manual: Actions tab → workflow → Run workflow.

## Enroll a chronic program

```bash
curl -X POST "$APP/api/programs/enroll" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{
    "externalEmployeeId": "11610",
    "employeeName": "سمير مكاري سعد نصرالله",
    "patientName": "مسعودة سعيد نصرالله",
    "relation": "spouse",
    "startDate": "2026-07-01",
    "endDate": "2026-12-31",
    "roshettaUrl": "https://drive.google.com/...",
    "meds": [
      {
        "requestedName": "Blokatens 5/160",
        "matchedName": "Blokatens 5/160",
        "companyPreferred": true,
        "formularyFlag": "EVA_PREFERRED"
      }
    ]
  }'
```

Then generate the month:

```bash
curl -X POST "$APP/api/refills/generate" \
  -H "Content-Type: application/json" \
  -d '{"period":"2026-10"}'
```

## UI

- `/` — process form responses
- `/refills` — generate month + review queue
- `/refills/[id]` — decide items + dispense
