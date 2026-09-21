# PNAT Assessment Logic — Deep Dive

## What PNAT is

**PNAT** (Patient Needs Assessment Tool) is the Axios-inspired layer we use to
personalize chronic-program support. Conceptually it mirrors WHO’s framework
for **adherence to long-term therapy** (five interacting dimensions),
not a single “compliance score”.

Axios describes PNAT as identifying risk factors that may lead a patient to
stop treatment and selecting interventions accordingly. Our implementation is
an **open operational model** for corporate medical aid — not Axios proprietary
software.

## WHO five dimensions

| Key | Dimension | Examples of barriers |
|-----|-----------|----------------------|
| `social_economic` | Social / economic | Cost, transport, literacy, family support, housing/work stability |
| `health_system` | Health system / provider | RX renewal friction, unclear plan, delayed approval, no continuity |
| `condition` | Condition-related | Asymptomatic stop risk, disability, comorbidities |
| `therapy` | Therapy / regimen | Polypharmacy, side effects, inhaler/injection technique, regimen changes |
| `patient` | Patient-related | Forgetfulness, beliefs, self-efficacy, stress |

## Scoring

- Each dimension: **1–5**
  - **1** = low barrier (favorable)
  - **5** = high barrier (risk of non-adherence)
- Missing dimension defaults to **3** (uncertain) so incomplete forms stay visible.

### Weights (corporate chronic aid)

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| therapy | 0.25 | Complex chronic regimens drive drop-out |
| social_economic | 0.22 | Affordability central to PAP/PSP |
| patient | 0.20 | Behavior / beliefs |
| condition | 0.18 | Disease perception |
| health_system | 0.15 | Partially controlled by our ops |

**Composite** = Σ (score × weight)

## Risk bands

| Band | Rule (simplified) | Ops response |
|------|-------------------|--------------|
| `low` | composite < 2.2 and max < 4 | Standard monthly refill |
| `medium` | composite < 3.2 or max ≥ 4 | SMS/call reminder before refill |
| `high` | composite ≥ 3.2 or any dim = 5 | Call within 1 week of dispense |
| `critical` | composite ≥ 4.0 or (dim=5 and ≥2 dims ≥4) | Contact ≤48h + eligibility review |

Also exposed: `risk_score_0_100` = linear map of composite from 1→0 to 5→100.

## Checklist path

Assessors can tick barriers per dimension (`PnatChecklist`).  
Count of true items → score: 0→1, 1→2, 2→3, 3→4, 4+→5.

Optional proxy: `therapyScoreFromMedCount(n)` from active med lines.

## Intervention engine

1. For every dimension with score ≥ 4, attach that dimension’s intervention list.  
2. Prepend band-level action (critical / high / medium).  
3. Deduplicate; store text on `adherence_assessments.interventions`.

## Data model

```text
adherence_assessments
  program_id, scores JSONB, risk_band, interventions, assessor, notes
chronic_programs.journey_stage → advances toward on_treatment after PNAT save
```

## API

```http
POST /api/psp
{ "action": "pnat", "program_id": "…",
  "scores": { "therapy": 4, "patient": 3, … } }

# or checklist
{ "action": "pnat", "program_id": "…",
  "checklist": { "therapy": { "complex_regimen": true, "side_effects": true } } }
```

## Relation to PFET

| Tool | Question |
|------|----------|
| **PFET** | How much financial help is needed? → `eligibility_tier` |
| **PNAT** | What threatens staying on treatment? → interventions + risk_band |

Both run after referral; together they feed Access Strategy → Implementation.
