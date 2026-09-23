# Invoice total validation

## Purpose

Decide whether an OCR-read pharmacy invoice total can safely fill `priceTotal`
on Approved-Requests. **Ops aid only** — always spot-check the image.

## Pipeline

1. `parseInvoiceText(ocrText)` → total, subtotal, tax, item line amounts
2. Optional formulary estimate = Σ (MEDDB3 unit × qty) for OCR med lines
3. `validateInvoiceTotal({ invoice, formulary_estimate_egp })`
4. `applyValidatedInvoicePrice(...)` only if `ok_for_auto_price`

## Cross-checks

| Check | Source |
|-------|--------|
| Item lines sum | Amounts on drug-like OCR lines |
| Formulary | MEDDB3 / external unit × qty |
| Subtotal + tax | When both labels present |

## Thresholds (env)

| Env | Default | Meaning |
|-----|---------|--------|
| `INVOICE_WARN_PCT` | 8 | Warn if relative Δ above this % |
| `INVOICE_FAIL_PCT` | 25 | Fail if relative Δ above this % |
| `INVOICE_WARN_EGP` | 50 | Warn if absolute Δ above this EGP |
| `INVOICE_FAIL_EGP` | 200 | Fail if absolute Δ above this EGP |

A check fails if **either** % **or** absolute EGP exceeds the fail threshold.

## Status rules

| Status | When |
|--------|------|
| `pass` | ≥1 cross-check within warn limits **and** total from explicit label |
| `warn` | Over warn, no cross-check, or unlabeled (max-on-page) total |
| `fail` | Any cross-check over fail limits |
| `unknown` | No OCR total |

`ok_for_auto_price` is **true only** when status is `pass` (labeled + ≥1 check).

## API

```bash
POST /api/ocr
{ "text": "…", "docKind": "invoice" }
# → form_fields.invoice_validation

POST /api/ocr
{ "action": "validate_invoice", "text": "…", "formulary_estimate_egp": 400 }
```

## Process integration

With `OCR_FILL_EMPTY_MEDS=true`, invoice total is written to price only when
`ok_for_auto_price` and the response has a single med line.
