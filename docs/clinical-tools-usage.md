# Clinical safety tools — disclaimer & usage examples

## Disclaimer (always applies)

These features are **operations triage aids** for the monthly medical-aid program.
They are **not**:

- A licensed clinical decision-support system (Lexicomp, Micromedex, FDB, etc.)
- A substitute for a pharmacist or physician
- A guarantee of interaction or allergy completeness

**DDInter 2.0** pair data (when imported) is used under **CC BY-NC-SA 4.0**
(non-commercial). Source: https://ddinter2.scbdd.com

**Allergy rules** encode common teaching points (e.g. penicillin ↔ amino-cephalosporin
side chains; NSAID class). Modern evidence shows true beta-lactam cross-reactivity is
often lower than older “10%” figures and is side-chain dependent — still escalate
severe/anaphylaxis histories to a clinician.

---

## 1. Ingredient synonyms

**UI:** `/synonyms`

**Purpose:** Map Egyptian / brand names to generic ingredients so DDInter and allergy
checks can match.

### Examples

| Alias (brand) | Ingredient |
|---------------|------------|
| Gliptus plus | sitagliptin |
| Empixera | empagliflozin |
| Tresiba | insulin degludec |
| Augmentin | amoxicillin |
| Brufen | ibuprofen |
| Coaxilor / Coxritor | etoricoxib |

### API

```bash
# Resolve one name
curl -sS "https://YOUR_APP/api/synonyms?resolve=Gliptus%20plus"

# Add mapping (requires PROCESS_SECRET / unlock)
curl -sS -X POST "https://YOUR_APP/api/synonyms" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"alias":"SomeBrand","ingredient":"metformin"}'

# Seed built-in list into DB
curl -sS -X POST "https://YOUR_APP/api/synonyms" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"seed_builtin":true}'
```

---

## 2. DDInter import & check

**UI:** `/ddinter`

### Import (once per environment)

```bash
# Small test file (blood/ATC B)
curl -sS -X POST "https://YOUR_APP/api/ddinter/import" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"codes":["B"]}'

# All ATC download files (may take minutes; watch Vercel timeout)
curl -sS -X POST "https://YOUR_APP/api/ddinter/import" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{}'
```

### Check interactions

```bash
# By drug names
curl -sS "https://YOUR_APP/api/ddinter/check?drugs=Warfarin,Aspirin,Ibuprofen"

# By chronic program UUID
curl -sS "https://YOUR_APP/api/ddinter/check?program_id=PROGRAM_UUID"

# POST
curl -sS -X POST "https://YOUR_APP/api/ddinter/check" \
  -H "Content-Type: application/json" \
  -d '{"drugs":["Warfarin","Aspirin"]}'
```

**Example interpretation**

```json
{
  "hits": [
    {
      "level": "Major",
      "drug_a": "Aspirin",
      "drug_b": "Warfarin",
      "matched_via": "Aspirin × Warfarin"
    }
  ],
  "resolved": [
    { "original": "Gliptus plus", "ingredient": "sitagliptin" }
  ]
}
```

`matched_via` may show `Brand→ingredient` when synonyms apply.

---

## 3. Combinations + DDInter scan

**UI:** `/combinations`

- Co-prescription frequency across active programs
- Optional **DDInter level** column on common pairs
- Scan of multi-drug regimens with hits

```bash
curl -sS "https://YOUR_APP/api/combinations"
curl -sS "https://YOUR_APP/api/ddinter/scan?limit=25"
```

---

## 4. Allergy cross-reactivity

**UI:** Program detail → **Allergies & cross-reactivity**

### Document an allergy

```bash
curl -sS -X POST "https://YOUR_APP/api/allergies" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{
    "dependent_id": "DEPENDENT_UUID",
    "allergen_label": "Penicillin",
    "severity": "anaphylaxis",
    "reaction_note": "ER visit 2019"
  }'
```

### Check program regimen

```bash
curl -sS "https://YOUR_APP/api/allergies?program_id=PROGRAM_UUID"
```

### Ad-hoc check (no patient record)

```bash
curl -sS -X POST "https://YOUR_APP/api/allergies" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{
    "action": "check",
    "allergies": [{ "allergen_label": "Penicillin", "severity": "severe" }],
    "meds": ["Cefalexin", "Azithromycin", "Augmentin"]
  }'
```

**Example expected flags**

| Allergen | Med | Typical flag |
|----------|-----|----------------|
| Penicillin | Augmentin (amoxicillin) | High — same class |
| Penicillin | Cefalexin | Moderate — amino side-chain |
| Penicillin | Ceftriaxone | Low — dissimilar side chain (still review if anaphylaxis) |
| Penicillin | Azithromycin | None |
| Sulfa / Bactrim | Septrin | High |
| NSAID | Brufen / Ibuprofen | High |

---

## 5. Recommended ops workflow

1. Deploy + set `DATABASE_URL`, `PROCESS_SECRET`
2. `/ddinter` → import at least ATC **B** (or all files)
3. `/synonyms` → seed builtin + add missing Egypt brands
4. On each program: document allergies → review **Allergy** + **DDInter** panels
5. `/combinations` for population patterns before pharmacy batch
6. **Never** auto-block dispense solely on a flag — route **Major / High** to pharmacist

---

## 6. What to tell clinicians / auditors

> Automated interaction and allergy screens are used for triage inside our corporate
> chronic medication program. Alerts are reviewed by operations and escalated to a
> pharmacist or physician when severity is Major/High or the patient has a severe
> allergy history. The tools do not constitute a certified clinical decision-support
> system.
