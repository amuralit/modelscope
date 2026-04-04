// ---------------------------------------------------------------------------
// Composite Scoring – weighted aggregation of all analysis modules
// ---------------------------------------------------------------------------

import type { CompositeScore, ScoringWeights } from "@/lib/types/model";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/constants/scoringWeights";

/**
 * Map from the keys used in `scores` (module result keys) to the
 * corresponding key in `ScoringWeights`. This allows callers to pass
 * scores keyed by any reasonable module name and still resolve the
 * correct weight.
 */
const MODULE_TO_WEIGHT_KEY: Record<string, keyof ScoringWeights> = {
  architecture: "architecture",
  architectureScan: "architecture",
  wseFit: "wseFit",
  wse_fit: "wseFit",
  speedSensitivity: "speedSensitivity",
  speed_sensitivity: "speedSensitivity",
  agenticFit: "agenticFit",
  agentic_fit: "agenticFit",
  competitiveGap: "competitiveGap",
  competitive_gap: "competitiveGap",
  demandSignal: "demandSignal",
  demand_signal: "demandSignal",
  reapPotential: "reapPotential",
  reap_potential: "reapPotential",
  reap: "reapPotential",
};

function resolveWeightKey(moduleKey: string): keyof ScoringWeights | undefined {
  return MODULE_TO_WEIGHT_KEY[moduleKey] ?? (moduleKey as keyof ScoringWeights);
}

/**
 * Derive a verdict from the final composite score.
 */
function deriveVerdict(score: number): CompositeScore["verdict"] {
  if (score >= 80) return "GO";
  if (score >= 50) return "EVALUATE";
  return "SKIP";
}

/**
 * Calculate the composite score from individual module scores.
 *
 * When a module is missing from `scores`, its weight is redistributed
 * proportionally across the modules that *are* present, so the result
 * always reflects the full 0–100 range regardless of how many modules
 * ran successfully.
 *
 * @param scores  - A record mapping module names to their 0-100 scores.
 * @param weights - Optional custom weights; defaults to `DEFAULT_SCORING_WEIGHTS`.
 * @returns Composite score with verdict and per‑module breakdown.
 */
export function calculateCompositeScore(
  scores: Record<string, number>,
  weights?: ScoringWeights,
): CompositeScore {
  const w: ScoringWeights = weights ?? DEFAULT_SCORING_WEIGHTS;

  // Resolve each provided score to its weight key
  const resolvedEntries: {
    moduleKey: string;
    weightKey: keyof ScoringWeights;
    score: number;
    rawWeight: number;
  }[] = [];

  for (const [moduleKey, moduleScore] of Object.entries(scores)) {
    const weightKey = resolveWeightKey(moduleKey);
    if (weightKey && w[weightKey] !== undefined) {
      resolvedEntries.push({
        moduleKey,
        weightKey,
        score: Math.max(0, Math.min(100, moduleScore)),
        rawWeight: w[weightKey],
      });
    }
  }

  // Sum of weights for present modules — used to redistribute
  const presentWeightSum = resolvedEntries.reduce(
    (sum, e) => sum + e.rawWeight,
    0,
  );

  // Build breakdown and compute weighted sum
  const breakdown: CompositeScore["breakdown"] = {};
  let compositeScore = 0;

  if (presentWeightSum > 0) {
    for (const entry of resolvedEntries) {
      // Redistribute: scale each weight so they sum to 1.0
      const effectiveWeight = entry.rawWeight / presentWeightSum;
      const weighted = entry.score * effectiveWeight;

      breakdown[entry.moduleKey] = {
        score: entry.score,
        weight: parseFloat(effectiveWeight.toFixed(4)),
        weighted: parseFloat(weighted.toFixed(2)),
      };

      compositeScore += weighted;
    }
  }

  const finalScore = Math.round(compositeScore);

  return {
    score: finalScore,
    verdict: deriveVerdict(finalScore),
    breakdown,
  };
}
