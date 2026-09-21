# PSP monthly ops SOP (Axios-aligned open model)

Until official Axios PNAT/PFET specs are loaded, use this workflow.

## Day 1–3 of month

1. **Generate refills** — `/refills` or GitHub Action `generate-refills`
2. **Care Line calendar** — `/care-line` → list **due** patients
3. **WhatsApp due batch** — `/notifications` → dry run first, then live if provider configured
4. **Batch release letters** (optional)
   ```http
   POST /api/psp/release-letter/batch
   { "period": "2026-09", "dry_run": true }
   ```
5. **Pharmacy pick lists** — `/pharmacy?formulary=EVA` and `NOT_EVA`

## Per patient (new or high-risk)

1. Open `/programs/[id]`
2. **Eligibility (PFET-style)** — income / med cost → tier + share
3. **PNAT-style** — 5 WHO dimensions → risk band + adherence plan
4. **Care Line** — log phone; optional WhatsApp
5. **Release letter** — issue before pharmacy pickup
6. **Adverse event** — if side effects reported
7. **Dropout** — WHO-coded reason if patient stops

## Weekly

- `/pms` — OTA metrics, open AEs, adherence reviews due
- High/critical PNAT → prioritize Care Line calls

## Axios proprietary package (when received)

Replace `lib/pnat.ts` and `lib/pfet.ts` scoring with official rules.
Keep tables (`adherence_assessments`, `pfet_assessments`) — only change evaluators.
