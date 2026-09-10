# Refill workflow

## States (`refill_cycles.status`)

`draft` → `submitted` → `in_review` → `approved` | `partially_approved` | `rejected` | `needs_info` → `dispensing` → `dispensed`

Any non-terminal state may go to `cancelled`.

## Item states (`refill_items.status`)

`pending` → `approved` | `rejected` | `skipped` → `dispensed`

## Monthly job

1. Select `chronic_programs` where `status = 'active'`
2. Skip if `refill_cycles` already exists for `(program_id, period)`
3. Insert cycle + copy active `chronic_med_lines` into `refill_items`
4. Price items → `estimated_total_egp`
5. Set status `submitted` or `in_review`

## APIs (planned)

| Method | Path | Action |
|--------|------|--------|
| POST | `/api/refills/generate` | `{ period: "YYYY-MM" }` |
| GET | `/api/refills?status=in_review` | Review queue |
| POST | `/api/refills/[id]/decide` | Approve/reject items |
| POST | `/api/refills/[id]/dispense` | Mark dispensed |
