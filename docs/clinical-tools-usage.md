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
side chains; NSAID class). True risk depends on reaction phenotype — escalate
severe/anaphylaxis histories to a clinician.

---

## Monthly ops sequence

1. `/ddinter` — import CSVs (at least ATC **B**)
2. `/synonyms` — seed + Egypt brands
3. Programs — document allergies
4. Generate refill cycles for the month
5. **`/refills/safety`** — clear Major / High queue
6. Approve/dispense with `acknowledge_safety: true` when gated
7. `/pharmacy` — pick list / CSV (banner shows flag count)

---

## Refill soft gate

Approve or dispense on a cycle with **DDI Major** or **allergy High** returns **HTTP 409**:

```json
{ "code": "safety_ack_required", "safety": { "summary": "…" } }
```

Retry with:

```bash
curl -X POST "https://YOUR_APP/api/refills/CYCLE_ID/decide" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"approveAll":true,"acknowledge_safety":true,"reviewed_by":"pharmacist"}'
```

Acknowledgment is written to **`audit_log`** (`action = safety_acknowledged`).

```bash
GET /api/refills/safety-queue?limit=40
```

---

## Synonyms

**UI:** `/synonyms`

```bash
curl -sS "https://YOUR_APP/api/synonyms?resolve=Gliptus%20plus"

curl -sS -X POST "https://YOUR_APP/api/synonyms" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"alias":"SomeBrand","ingredient":"metformin"}'
```

---

## DDInter

```bash
POST /api/ddinter/import  {"codes":["B"]}
GET  /api/ddinter/check?drugs=Warfarin,Aspirin
GET  /api/ddinter/check?program_id=UUID
GET  /api/ddinter/scan?limit=25
```

---

## Allergies

```bash
POST /api/allergies  {
  "dependent_id": "…",
  "allergen_label": "Penicillin",
  "severity": "anaphylaxis"
}

GET  /api/allergies?program_id=UUID

POST /api/allergies  {
  "action": "check",
  "allergies": [{ "allergen_label": "Penicillin", "severity": "severe" }],
  "meds": ["Cefalexin", "Augmentin"]
}
```

---

## What to tell auditors

> Automated interaction and allergy screens support triage inside our corporate
> chronic medication program. Major/High alerts require an explicit
> acknowledge_safety step before approve/dispense. This is not a certified
> clinical decision-support system.
