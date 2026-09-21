# WHO standards mapped to Medical Aid / PNAT

Primary reference:
**WHO (2003). Adherence to long-term therapies: evidence for action.**
https://iris.who.int/handle/10665/42682

## Official definition (WHO)

> *The extent to which a person’s behaviour — taking medication, following a diet,
> and/or executing lifestyle changes — corresponds with **agreed** recommendations
> from a health care provider.*

WHO stresses **adherence** (agreed plan) rather than passive **compliance**.

## Core principle

Adherence is **multidimensional**. Blaming only the patient is incorrect.
All five dimensions must be assessed and addressed systematically.

## The five dimensions (WHO framework)

| # | Dimension | WHO focus | Our PNAT key |
|---|-----------|-----------|--------------|
| 1 | Social and economic | Poverty, literacy, transport, cost, social support | `social_economic` |
| 2 | Health system / health-care team | Provider relationship, continuity, access, education capacity | `health_system` |
| 3 | Condition-related | Symptom severity, disability, comorbidity, disease progression | `condition` |
| 4 | Therapy-related | Regimen complexity, duration, side effects, treatment changes | `therapy` |
| 5 | Patient-related | Knowledge, beliefs, motivation, forgetfulness, self-efficacy | `patient` |

## Implications for program design (WHO message)

1. Interventions should be **multi-dimensional**, not only patient education.  
2. Health systems must reduce friction (renewal, dispensing, follow-up).  
3. Affordability and social support are structural, not “patient failure”.  
4. Complex regimens need simplification where possible.  
5. Follow-up and relationship with the care team improve persistence.

## Related WHO products (context, not all coded)

- **Essential Medicines List (EML)** — prioritization of cost-effective drugs  
- **Hypertension pharmacological guideline (2021+)** — prefers simpler regimens / SPCs to improve adherence  
- **TB care & support** — education, material support, tracers, psychological support packages  

## How this system applies WHO

| WHO idea | Implementation |
|----------|----------------|
| Five dimensions | `lib/pnat.ts` scores + interventions |
| Multi-factor interventions | Band + dimension intervention engine |
| System responsibility | Journey stages, refill ops, pharmacy SLA |
| Affordability | PFET-style `eligibility_tier`, EVA formulary |
| Continuity | Monthly `refill_cycles`, documents, program status |
| Measurement | `adherence_assessments` history |

## What we do **not** claim

- PNAT scores are **not** a WHO-validated psychometric instrument.  
- They are an **operational triage** model shaped by the WHO five-dimension frame.  
- Clinical decisions remain with licensed providers; this supports program ops.

## References

1. World Health Organization (2003). *Adherence to long-term therapies: evidence for action.* Geneva: WHO. ISBN 92 4 154599 2.  
2. WHO IRIS: https://iris.who.int/handle/10665/42682  
