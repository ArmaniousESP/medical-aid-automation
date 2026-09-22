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

## Recommended monthly flow

1. `/ddinter` — import pairs (at least ATC B, or all)
2. `/synonyms` — seed + Egypt brands
3. Programs — document allergies
4. `/combinations` — population patterns
5. `/refills/safety` — **safety queue** (Major / High only)
6. Open each flagged cycle → check acknowledgment → approve/dispense
7. `/pharmacy` — pick list (banner shows flagged count)

---

## Refill soft safety gate

On approve or dispense:

- If the program has **DDI Major** or **allergy High**, the API returns **HTTP 409**
  with `code: "safety_ack_required"` unless the body includes:

```json
{ "acknowledge_safety": true, "reviewed_by": "pharmacist" }
```

- UI: checkbox on `/refills/[id]` unlocks Approve / Dispense
- Audit: `audit_log` action `safety_acknowledged` when ack is used
- Reject / Skip are never gated

```bash
# Will 409 if high flags
POST /api/refills/{id}/decide  {"approveAll":true}

# After review
POST /api/refills/{id}/decide  {
  "approveAll": true,
  "acknowledge_safety": true,
  "reviewed_by": "pharmacist"
}

# Queue
GET /api/refills/safety-queue?limit=40
```

---

## 1. Ingredient synonyms

**UI:** `/synonyms`

```bash
curl -sS "https://YOUR_APP/api/synonyms?resolve=Gliptus%20plus"

curl -sS -X POST "https://YOUR_APP/api/synonyms" \
  -H "Content-Type: application/json" \
  -H "x-process-secret: $PROCESS_SECRET" \
  -d '{"alias":"SomeBrand","ingredient":"metformin"}'
```

---

## 2. DDInter

**UI:** `/ddinter`

```bash
POST /api/ddinter/import  {"codes":["B"]}
GET  /api/ddinter/check?drugs=Warfarin,Aspirin
GET  /api/ddinter/check?program_id=UUID
GET  /api/ddinter/scan?limit=25
```

---

## 3. Combinations

**UI:** `/combinations`

```bash
GET /api/combinations
```

---

## 4. Allergy cross-reactivity

**UI:** Program detail → Allergies

```bash
GET  /api/allergies?program_id=UUID
POST /api/allergies  {
  "dependent_id": "…",
  "allergen_label": "Penicillin",
  "severity": "anaphylaxis"
}
POST /api/allergies  {
  "action": "check",
  "allergies": [{"allergen_label":"Penicillin","severity":"severe"}],
  "meds": ["Cefalexin","Augmentin"]
}
```

---

## What to tell auditors

> Automated interaction and allergy screens are used for triage inside our corporate
> chronic medication program. Alerts are reviewed by operations and escalated to a
> pharmacist or physician when severity is Major/High. Approve/dispense requires an
> explicit acknowledgment when high flags are present. The tools do not constitute a
> certified clinical decision-support system.
