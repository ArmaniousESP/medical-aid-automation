# Platform cycle — fulfillment checklist

## Goal (done)

Run monthly medical aid **without Google Form/Sheet** as the system of record.

| Capability | Status | Where |
|------------|--------|--------|
| Beneficiary submit | Done | `/intake` |
| Ops queue | Done | `/intake-ops` |
| Match + auto-enroll | Done | `POST /api/process-intake` |
| Claim drafts | Done | `/claims` (auto on enroll by default) |
| Programs | Done | `/programs` |
| Pharmacy pick list | Done | `/pharmacy` |
| Navigation + guide | Done | Top nav · `/guide` |
| Health / setup | Done | `/status` |
| Error details | Done | process-intake `errors[]` |
| MSH catalog (optional) | Done | `lib/msh.ts` + search on intake |
| Google sheet | Legacy only | collapsed on Home |

## Env (minimum)

```bash
DATABASE_URL=          # Neon pooler — required
PROCESS_SECRET=        # recommended
# Defaults (no need to set unless changing):
# AUTO_ENROLL_INTAKE=true
# AUTO_CLAIM_ON_ENROLL=true
```

Optional: `GOOGLE_*`, `CLAIMS_WEBHOOK_URL`, `MSH_API_KEY`, WhatsApp envs.

## Operator path

1. `/guide`
2. `/intake` — test submit
3. `/intake-ops` — Process platform intake
4. `/claims` — review drafts → Submit
5. `/programs` · `/pharmacy` — dispense

## Done when

- [ ] Redeployed latest `main`
- [ ] `/status` shows Ready (Neon OK)
- [ ] One test request flows submit → enrolled → draft claim
- [ ] Beneficiaries use `/intake` instead of Google Form
