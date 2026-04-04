// ---------------------------------------------------------------------------
// Default scoring weights for composite model evaluation
// ---------------------------------------------------------------------------

import type { ScoringWeights } from "../types/model";

/**
 * Default weights used to combine individual module scores into a single
 * composite score.  All weights must sum to 1.0.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  architecture: 0.2,
  wseFit: 0.2,
  speedSensitivity: 0.2,
  agenticFit: 0.15,
  competitiveGap: 0.1,
  demandSignal: 0.1,
  reapPotential: 0.05,
} as const;

/** Ordered list of weight keys matching the analysis pipeline sequence. */
export const WEIGHT_KEYS: (keyof ScoringWeights)[] = [
  "architecture",
  "wseFit",
  "speedSensitivity",
  "agenticFit",
  "competitiveGap",
  "demandSignal",
  "reapPotential",
];

/**
 * Validate that a set of weights sums to 1.0 (within floating‑point
 * tolerance).
 */
export function validateWeights(weights: ScoringWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 1e-6;
}
