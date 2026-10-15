# Alignment with Axios International (public model)

## Business model

| | Axios International (typical) | This platform |
|--|-------------------------------|---------------|
| Payer | Pharma / access sponsor | Employer / group medical aid |
| Goal | Start & stay on therapy | Monthly chronic support for staff/dependents |
| Product | Commercial PSP / PAP operator | Corporate chronic-aid OS |

We align on **journey architecture and ops practices**, not on Axios proprietary products (PNAT instrument, PFET validation IP, PMS, Axios+).

## Operational mapping

| Axios public concept | Implementation |
|----------------------|----------------|
| Referral → enroll → dispense → follow-up | Intake → programs → pharmacy → refills |
| Treatment plan | `chronic_med_lines` |
| Pharmacy release | Pick-list + release letters |
| Care line | Care-line + optional WhatsApp |
| Needs assessment | Optional WHO-aligned triage (`lib/pnat.ts`) |
| Ability-to-pay | Transparent policy rules (`lib/pfet.ts`) |
| Multi-program ops | Organizations + `org_code` scope |
| Accountability | `audit_events` |

## Organizations seeded for Egypt ops

- `ARMANIOUS` — aliases include Armanious
- `EVA` — EVA Pharma
- `TAGMEEL` — تجميل
- `DEFAULT` — platform fallback

Company text on intake is matched to `organizations` code / name / `settings.aliases`.

## What not to claim

- Not Axios PMS or Axios+
- Not validated commercial PNAT/PFET instruments
- Suitable partner *alongside* Axios for employer programs; not a substitute for manufacturer PAP contracts
