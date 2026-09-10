# Medical Aid Automation

**طلب مساعدة علاج شهري — استمارة 9**

End-to-end automation for monthly medical aid:

1. **Google Form → Sheets** — expand meds, match MEDDB3/EVA, parse qty, attachments, prices  
2. **Neon DB** — chronic programs, monthly refill cycles, review & dispense  
3. **No external TPA required** — self-funded internal OS

Stack: **Next.js 14** · **Vercel** · **Neon PostgreSQL** · **GitHub Actions**

---

## Pipeline

```
Google Form
  → POST /api/process          (match · price · Approved-Requests)
  → POST /api/programs/sync-from-sheet   (employee+patient → chronic_programs)
  → POST /api/refills/generate (monthly, scheduled day 1)
  → /refills UI                (approve / reject / dispense)
```

| UI | Purpose |
|----|--------|
| `/` | Process form + **مزامنة البرامج المزمنة** |
| `/programs` | List chronic programs |
| `/refills` | Generate month + review queue |
| `/refills/[id]` | Decide lines + dispense |

---

## Features

| Area | Capabilities |
|------|----------------|
| Form processing | Up to 7 meds/row, fuzzy MEDDB3, EVA flag, Arabic/English qty, Drive links |
| Pricing | MEDDB3 → DwaPrices → Egyptian open drug DB |
| Chronic OS | Programs, med lines, formulary flags, attachments |
| Refills | Idempotent monthly cycles, partial approve, dispense + audit |
| Automation | Daily process+sync Action · Monthly generate Action |

---

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes (process) | Share sheet as Editor |
| `GOOGLE_PRIVATE_KEY` | Yes | Keep `\n` |
| `GOOGLE_SHEET_ID` | Yes | From spreadsheet URL |
| `DATABASE_URL` | Yes (chronic) | Neon **pooled** connection |
| `PROCESS_SECRET` | Recommended | Header `x-process-secret` |
| `AUTO_ENROLL_CHRONIC` | Optional | Default on; set `false` to disable |
| `VERCEL_APP_URL` | GitHub Actions | e.g. `https://app.vercel.app` |

See `.env.example` and `docs/operations.md`.

---

## Neon

Project: `medical-aid-automation`  
Schema: `docs/schema/001_chronic_core.sql`  
Tables: organizations → employees → dependents → chronic_programs → chronic_med_lines → refill_cycles → refill_items

---

## GitHub Actions

| Workflow | Schedule | Calls |
|----------|----------|--------|
| `process-medical-aid.yml` | Daily 06:00 UTC | `/api/process` then `/api/programs/sync-from-sheet` |
| `generate-refills.yml` | 1st of month 05:00 UTC | `/api/refills/generate` |

Secrets: `VERCEL_APP_URL`, `PROCESS_SECRET` (+ Google if needed for local runs).

---

## Quick API

```bash
# Process + auto-enroll
curl -X POST "$APP/api/process" -H "Content-Type: application/json" \
  -H "x-process-secret: $SECRET" -d '{"dryRun":false}'

# Full sheet → programs
curl -X POST "$APP/api/programs/sync-from-sheet" -H "x-process-secret: $SECRET"

# Monthly refills
curl -X POST "$APP/api/refills/generate" -H "Content-Type: application/json" \
  -d '{"period":"2026-10"}'
```

---

## Local

```bash
npm install
cp .env.example .env.local   # fill values
npm run dev
```

---

## Sheet tabs

| Sheet | Role |
|-------|------|
| `Form Responses 1` | Raw submissions |
| `Approved-Requests` | Expanded output |
| `MEDDB3` | Catalog (name, price, Eva-similar) |

---

Private – internal use.
