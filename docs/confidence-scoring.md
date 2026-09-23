# Confidence scoring

## Why multi-factor?

A single fuzzy ratio is brittle. Clinical OCR systems (and papers such as ExtractConf / prescription pipelines) combine:

1. **Match quality** — token + character n-gram similarity to formulary
2. **Cross-evidence** — invoice line sum, formulary estimate, subtotal+tax
3. **Evidence quality** — labeled totals vs inferred max-on-page
4. **Coverage** — how many med lines scored, weakest line

## Bands

| Band | Default | Action |
|------|---------|--------|
| `auto` | ≥ 0.85 | Safe to auto-fill with audit trail |
| `review` | 0.70–0.85 | Staff should confirm |
| `manual` | < 0.70 | Do not trust without human check |

Env: `CONFIDENCE_AUTO`, `CONFIDENCE_REVIEW`.

## Algorithms in this repo

### Med match (`medMatchConfidence`)
- Primary: `similarity()` Dice bigrams + token Jaccard (see `lib/matching.ts`)
- Boosts: exact normalized match, EVA formulary hint

### OCR meds (`ocrMedsConfidence`)
Weighted average of:
- avg match score (0.5)
- min match score (0.3) — penalizes one weak line
- line coverage (0.2)

### Invoice (`invoiceConfidence`)
- validation status (pass/warn/fail)
- number of cross-checks
- agreement (1 − worstΔ%/25)
- labeled / `ok_for_auto_price`
- blended with engine `validation.confidence`

### Request (`requestConfidence`)
Combines OCR meds + invoice + typed matches when present.

## API surface

`form_fields.confidence_detail` on `POST /api/ocr`:

```json
{
  "score": 0.82,
  "band": "review",
  "factors": [{ "name": "avg_match", "score": 0.9, "weight": 0.5 }],
  "summary": "Request 82% → review"
}
```

## Not clinical

Scores support **operations** (queue, auto-price gate). They are not a medical diagnosis or adherence score.
