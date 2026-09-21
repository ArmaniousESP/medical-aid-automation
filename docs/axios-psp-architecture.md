# Axios-aligned Patient Support Program (PSP) Architecture

Adapted from Axios International’s public model for corporate chronic medical aid
(استمارة 9 · Medical Aid Automation).

## Axios three-step loop

1. **Access Strategy** — who is eligible, formulary (EVA vs not), monthly caps  
2. **Setup & Implementation** — enroll program, med lines, documents, refill cycles  
3. **Access Optimization** — analytics, adherence, inventory, cost trends  

## Journey stages (Patient Management)

| Stage | Axios analogue | Our system |
|-------|----------------|------------|
| Referral | Physician / HR form | Google Form → responses sheet |
| Eligibility | PFET (ability to pay / need) | Company policy + formulary flag |
| Needs assessment | PNAT (WHO adherence dimensions) | `adherence_assessments` |
| Enrollment | PSP registration | `chronic_programs` active |
| Treatment plan | Med schedule | `chronic_med_lines` |
| Documentation | Clinical docs | `attachments` / `/documents` |
| Dispense | Pharmacy | `refill_cycles` + inventory |
| Follow-up | Care line / reminders | refill period + status tracking |
| Completion / dropout | Exit | program suspended / expired |

## Stakeholder map (Axios+)

| Role | Axios app | Our surface |
|------|-----------|-------------|
| Program ops | PMS / My Programs | `/programs`, `/requests`, `/analytics` |
| Pharmacy | My Pharmacy | `/pharmacy`, `/inventory` |
| Physician / docs | My Patients | `/documents`, program detail |
| Partner reporting | My Programs insights | `/analytics`, `/visualize`, `/reports` |

## Access models we support

- **Formulary preference** — Available in EVA vs NOT IN EVA (`/eva-split`)  
- **Monthly refill** — fixed days_supply, generate period cycles  
- **Co-pay / company gap** — `company_gap_egp` on refill cycles (optional)  
- **Documentation gate** — prescription required before first dispense (policy)  

## PNAT dimensions (WHO)

Stored in `adherence_assessments.scores` JSON:

1. Social/economic  
2. Health system  
3. Condition-related  
4. Therapy-related  
5. Patient-related  

Risk band → intervention notes (education, reminder, home support).

## PFET (simplified)

`eligibility_tier`: `full_cover` | `partial` | `self_pay` | `review`  
Optional `monthly_patient_share_egp` on program.

## Data flow

```
Form → Approved-Requests → Neon enroll
  → attachments (روشتة)
  → monthly refill generate
  → pharmacy pick-list (EVA / NOT EVA)
  → dispense + inventory move
  → analytics / visualize
```
