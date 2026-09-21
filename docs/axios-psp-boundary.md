# Axios International PSP — what we implement vs what we cannot

## Proprietary (Axios-owned — do not copy)

Axios International publicly states that these are **proprietary, validated tools**:

- **PNAT** — full commercial questionnaire instrument and scoring IP
- **PFET** — full commercial financial-eligibility instrument and validation studies
- **Patient Management System (PMS)** — their production platform
- **Axios+** apps (My Patients, My Pharmacy, My Health, My Programs)

We **do not** reverse-engineer, scrape, or claim compatibility with those products.
To use the real Axios stack: partner commercially → axios@axiosint.com

## What this repo implements (open operational model)

Inspired by **publicly described** Axios program architecture and WHO adherence dimensions:

| Public concept | Our module |
|----------------|------------|
| Referral → enrolment → dispense → follow-up → exit | `journey_stage` |
| WHO five dimensions of adherence | `lib/pnat.ts` (operational triage, not Axios PNAT) |
| Ability-to-pay / cost share | `lib/pfet.ts` (transparent policy rules, not Axios PFET) |
| Personalized adherence plan | `adherence_plans` |
| Care line / phone follow-up | `care_line_contacts` + WhatsApp |
| Pharmacy release | refill cycles + `release_letters` |
| OTA-style time-to-treatment | `enrolled_at` / `first_dispense_at` |
| Adverse event log | `adverse_events` |
| Partner dashboard | `/pms`, `/analytics` |

## Positioning

**Corporate chronic medical aid OS** aligned with PSP best practices — suitable for employee/dependent monthly formulary programs (استمارة 9), not a substitute for an Axios-managed pharma PAP.
