# Medical Aid Automation

**طلب مساعدة علاج شهري** — platform-native monthly treatment support

System of record: **Neon** (not Google Sheets).  
Stack: **Next.js 14** · **Vercel** · **Neon PostgreSQL** · **GitHub**

Live: [medical-aid-automation.vercel.app](https://medical-aid-automation.vercel.app)  
Guide: [/guide](https://medical-aid-automation.vercel.app/guide)

---

## Primary cycle (use this)

```
/intake          → beneficiary submits
/intake-ops     → ops reviews + Process platform intake
                   (match · enroll · claim draft)
/claims         → review / submit amounts
/programs       → chronic programs
/pharmacy       → pick list · dispense
```

| UI | Purpose |
|----|--------|
| `/guide` | Step-by-step how to use |
| `/intake` | Submit request (no Google Form) |
| `/intake-ops` | Queue + process |
| `/claims` | Claim drafts |
| `/programs` | Active chronic programs |
| `/pharmacy` | EVA / NOT EVA pick list |
| `/status` | Readiness (Neon) |
| `/` | Dashboard + process buttons |

**Legacy:** Google Form → sheet → `/api/process` still works if `GOOGLE_*` is set; not required.

---

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | Neon **pooler** connection |
| `PROCESS_SECRET` | Recommended | Unlock ops APIs |
| `AUTO_ENROLL_INTAKE` | Optional | Default **on**; set `false` to disable |
| `AUTO_CLAIM_ON_ENROLL` | Optional | Default **on**; set `false` to disable |
| `CLAIMS_WEBHOOK_URL` | Optional | External TPA push |
| `GOOGLE_*` + `GOOGLE_SHEET_ID` | Optional | Legacy sheet path only |
| `MSH_API_BASE` / `MSH_API_KEY` | Optional | Medicine Support Hub catalog |

---

## Key APIs

```bash
# Platform intake process (match + enroll + claim)
curl -X POST "$APP/api/process-intake" -H "Content-Type: application/json" \
  -H "x-process-secret: $SECRET" -d '{"dryRun":false}'

# Health
curl "$APP/api/health"

# Legacy sheet process
curl -X POST "$APP/api/process" -H "Content-Type: application/json" \
  -H "x-process-secret: $SECRET" -d '{"dryRun":false}'
```

---

## Docs

- `docs/PLATFORM_COMPLETE.md` — fulfillment checklist  
- `docs/platform-intake-msh.md` — intake + MSH  
- `docs/claims.md` — claims API  
- `docs/schema/001_chronic_core.sql` — Neon schema  

---

## Local

```bash
npm install
cp .env.example .env.local   # DATABASE_URL minimum
npm run dev
```

Private – internal use.
