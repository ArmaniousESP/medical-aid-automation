/**
 * Multi-factor confidence scoring for med matching, OCR, and invoice totals.
 *
 * Inspired by common clinical OCR pipelines:
 *  - Fuzzy match score (Dice / token overlap) as primary signal
 *  - Cross-check agreement (invoice lines, formulary, subtotal+tax)
 *  - Evidence quality (labeled vs inferred totals, # of med lines)
 *
 * Bands (configurable via env):
 *  ≥ auto threshold  → auto (safe for automation with audit)
 *  review band       → review recommended
 *  < manual threshold → manual verification required
 *
 * Ops aid only — never a clinical decision.
 */

import type { InvoiceValidation } from '@/lib/invoiceOcr';

export type ConfidenceBand = 'auto' | 'review' | 'manual';

export type FactorScore = {
  name: string;
  score: number; // 0–1
  weight: number;
  note?: string;
};

export type ConfidenceResult = {
  score: number; // 0–1 weighted composite
  band: ConfidenceBand;
  factors: FactorScore[];
  auto_threshold: number;
  review_threshold: number;
  summary: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function getConfidenceThresholds() {
  return {
    auto: Number(process.env.CONFIDENCE_AUTO || 0.85),
    review: Number(process.env.CONFIDENCE_REVIEW || 0.7),
  };
}

export function bandFromScore(
  score: number,
  auto = getConfidenceThresholds().auto,
  review = getConfidenceThresholds().review
): ConfidenceBand {
  if (score >= auto) return 'auto';
  if (score >= review) return 'review';
  return 'manual';
}

function composite(factors: FactorScore[]): number {
  const totalW = factors.reduce((a, f) => a + f.weight, 0) || 1;
  const sum = factors.reduce((a, f) => a + clamp01(f.score) * f.weight, 0);
  return Math.round((sum / totalW) * 1000) / 1000;
}

/** Single medication fuzzy-match confidence. */
export function medMatchConfidence(input: {
  matchScore: number;
  exactNorm?: boolean;
  hasEvaHint?: boolean;
}): ConfidenceResult {
  const factors: FactorScore[] = [
    {
      name: 'fuzzy_match',
      score: clamp01(input.matchScore),
      weight: 0.75,
      note: `similarity ${Math.round(clamp01(input.matchScore) * 100)}%`,
    },
  ];
  if (input.exactNorm) {
    factors.push({
      name: 'exact_norm',
      score: 1,
      weight: 0.15,
      note: 'normalized exact match',
    });
  }
  if (input.hasEvaHint) {
    factors.push({
      name: 'eva_hint',
      score: 0.9,
      weight: 0.1,
      note: 'EVA / formulary hint present',
    });
  }
  const score = composite(factors);
  const { auto, review } = getConfidenceThresholds();
  const band = bandFromScore(score, auto, review);
  return {
    score,
    band,
    factors,
    auto_threshold: auto,
    review_threshold: review,
    summary: `Med match ${Math.round(score * 100)}% → ${band}`,
  };
}

/** Aggregate confidence over a list of OCR med lines. */
export function ocrMedsConfidence(input: {
  matchScores: number[];
  lineCount: number;
  maxMeds?: number;
}): ConfidenceResult {
  const scores = input.matchScores.filter((s) => s > 0);
  const avg =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const coverage = clamp01(input.lineCount / (input.maxMeds || 7));

  const factors: FactorScore[] = [
    {
      name: 'avg_match',
      score: avg,
      weight: 0.5,
      note: `avg ${Math.round(avg * 100)}% over ${scores.length} scored lines`,
    },
    {
      name: 'min_match',
      score: min,
      weight: 0.3,
      note: `weakest line ${Math.round(min * 100)}%`,
    },
    {
      name: 'line_coverage',
      score: input.lineCount > 0 ? Math.min(1, 0.5 + coverage * 0.5) : 0,
      weight: 0.2,
      note: `${input.lineCount} med line(s)`,
    },
  ];

  const score = composite(factors);
  const { auto, review } = getConfidenceThresholds();
  const band = bandFromScore(score, auto, review);
  return {
    score,
    band,
    factors,
    auto_threshold: auto,
    review_threshold: review,
    summary: `OCR meds ${Math.round(score * 100)}% → ${band}`,
  };
}

/**
 * Invoice confidence from validation object.
 * Prefer structured validation.confidence when present; else derive.
 */
export function invoiceConfidence(
  validation: InvoiceValidation | null | undefined
): ConfidenceResult {
  const { auto, review } = getConfidenceThresholds();
  if (!validation) {
    return {
      score: 0,
      band: 'manual',
      factors: [{ name: 'missing', score: 0, weight: 1, note: 'no validation' }],
      auto_threshold: auto,
      review_threshold: review,
      summary: 'Invoice confidence n/a → manual',
    };
  }

  const factors: FactorScore[] = [
    {
      name: 'validation_status',
      score:
        validation.status === 'pass'
          ? 1
          : validation.status === 'warn'
            ? 0.55
            : validation.status === 'fail'
              ? 0.15
              : 0.25,
      weight: 0.35,
      note: validation.status,
    },
    {
      name: 'cross_checks',
      score: clamp01((validation.cross_checks || 0) / 3),
      weight: 0.25,
      note: `${validation.cross_checks} checks`,
    },
    {
      name: 'agreement',
      score: (() => {
        const pcts = [
          validation.vs_lines_pct,
          validation.vs_formulary_pct,
          validation.vs_subtotal_tax_pct,
        ].filter((x): x is number => x != null);
        if (!pcts.length) return 0.3;
        // Map 0% Δ → 1.0, 25% Δ → 0
        const worst = Math.max(...pcts);
        return clamp01(1 - worst / 25);
      })(),
      weight: 0.25,
      note: 'closeness of amounts',
    },
    {
      name: 'labeled_total',
      score: validation.ok_for_auto_price || validation.status === 'pass' ? 1 : 0.4,
      weight: 0.15,
      note: validation.ok_for_auto_price ? 'ok_for_auto_price' : 'not auto',
    },
  ];

  // Blend with engine-provided confidence if available
  let score = composite(factors);
  if (typeof validation.confidence === 'number') {
    score = Math.round(((score + validation.confidence) / 2) * 1000) / 1000;
  }

  const band = bandFromScore(score, auto, review);
  return {
    score,
    band,
    factors,
    auto_threshold: auto,
    review_threshold: review,
    summary: `Invoice ${Math.round(score * 100)}% → ${band}`,
  };
}

/**
 * Request-level composite: OCR meds + optional invoice + optional avg match.
 */
export function requestConfidence(input: {
  ocrMeds?: ConfidenceResult | null;
  invoice?: ConfidenceResult | null;
  medMatches?: number[]; // individual match scores 0–1
}): ConfidenceResult {
  const factors: FactorScore[] = [];

  if (input.ocrMeds) {
    factors.push({
      name: 'ocr_meds',
      score: input.ocrMeds.score,
      weight: 0.45,
      note: input.ocrMeds.summary,
    });
  }
  if (input.invoice) {
    factors.push({
      name: 'invoice',
      score: input.invoice.score,
      weight: 0.35,
      note: input.invoice.summary,
    });
  }
  if (input.medMatches && input.medMatches.length) {
    const avg =
      input.medMatches.reduce((a, b) => a + b, 0) / input.medMatches.length;
    factors.push({
      name: 'typed_matches',
      score: avg,
      weight: 0.2,
      note: `avg match ${Math.round(avg * 100)}%`,
    });
  }

  if (!factors.length) {
    const { auto, review } = getConfidenceThresholds();
    return {
      score: 0,
      band: 'manual',
      factors: [],
      auto_threshold: auto,
      review_threshold: review,
      summary: 'No signals → manual',
    };
  }

  const score = composite(factors);
  const { auto, review } = getConfidenceThresholds();
  const band = bandFromScore(score, auto, review);
  return {
    score,
    band,
    factors,
    auto_threshold: auto,
    review_threshold: review,
    summary: `Request ${Math.round(score * 100)}% → ${band}`,
  };
}
