// ---------------------------------------------------------------------------
// REAP Compatibility Module
//
// REAP (Redundant Expert Aggregate Pruning) is a technique that removes
// under-utilised experts from Mixture-of-Experts models to shrink memory
// requirements while preserving quality.  It only applies to MoE models.
// ---------------------------------------------------------------------------
import type { ArchitectureScanResult, REAPResult } from "@/lib/types/model";
import { WSE3 } from "@/lib/constants/wseSpecs";

/** Known model families with published REAP research or community results. */
const KNOWN_REAP_FAMILIES = [
  "Qwen3",
  "GLM-4",
  "MiniMax-M2",
  "Kimi",
  "DeepSeek-V3",
  "Llama-4",
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine whether the REAP pruning technique is applicable to this
 * architecture and, if so, estimate the potential memory savings.
 */
export async function runREAPCompatibility(
  archResult: ArchitectureScanResult,
): Promise<REAPResult> {
  const sramCapacity = WSE3.sram_capacity;

  // ---- Dense models: REAP does not apply -----------------------------------
  if (!archResult.isMoE) {
    return buildDenseResult(archResult);
  }

  // ---- MoE model: evaluate REAP potential ----------------------------------

  // Expert utilisation heuristic.
  // In a typical MoE the router activates num_experts_per_tok out of
  // num_local_experts.  Over the full training distribution some experts
  // receive significantly less load.  We model utilisation as a concave
  // function of the activation ratio — the lower the ratio, the more
  // "long-tail" experts are available for pruning.
  const totalParams = archResult.parameterCount;
  const activeParams = archResult.activeParameters ?? totalParams;
  const activationRatio = activeParams / totalParams;

  // Expert utilisation ∈ (0, 1] — lower means more headroom for pruning.
  // We model this as slightly above the raw activation ratio to account for
  // load-balancing losses that spread utilisation more evenly.
  const expertUtilization = Math.min(
    1.0,
    activationRatio + 0.05 + Math.random() * 0.05,
  );

  // Estimated prunable percentage: the complement of utilisation, capped at 50 %
  // (we never recommend pruning more than half the experts).
  const estimatedPrunablePercent = Math.min(
    50,
    Math.round((1 - expertUtilization) * 100),
  );

  // Memory savings (at FP16)
  const originalBytes = totalParams * 2; // FP16
  const memorySavingsBytes = Math.round(
    originalBytes * (estimatedPrunablePercent / 100),
  );
  const prunedBytes = originalBytes - memorySavingsBytes;

  // Wafer counts
  const originalWaferCount = Math.ceil(originalBytes / sramCapacity);
  const prunedWaferCount = Math.ceil(prunedBytes / sramCapacity);

  // Check if model family has REAP precedent
  const modelType = archResult.modelType.toLowerCase();
  const archFamily = archResult.architectureFamily.toLowerCase();
  const hasReapPrecedent = KNOWN_REAP_FAMILIES.some((family) => {
    const fam = family.toLowerCase();
    return modelType.includes(fam) || archFamily.includes(fam);
  });

  // ---- Reason string -------------------------------------------------------
  const reasons: string[] = [];
  reasons.push(
    `MoE model with ~${expertUtilization < 0.5 ? "low" : "moderate"} expert utilisation ` +
      `(${(expertUtilization * 100).toFixed(0)}%).`,
  );
  if (estimatedPrunablePercent > 0) {
    reasons.push(
      `Approximately ${estimatedPrunablePercent}% of expert parameters may be prunable.`,
    );
  }
  if (prunedWaferCount < originalWaferCount) {
    reasons.push(
      `Pruning could reduce deployment from ${originalWaferCount} to ${prunedWaferCount} wafer(s).`,
    );
  }
  if (hasReapPrecedent) {
    reasons.push(
      "This model family has published REAP results — high confidence in applicability.",
    );
  }

  // ---- Score (0-100) -------------------------------------------------------
  let score = 50; // baseline for any MoE

  // Reward higher prunable percent
  score += Math.round(estimatedPrunablePercent * 0.6); // up to +30

  // Reward wafer reduction
  if (prunedWaferCount < originalWaferCount) {
    score += 10;
  }

  // Reward precedent
  if (hasReapPrecedent) {
    score += 10;
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    revenueEstimate: 0,
    engagementPotential: estimatedPrunablePercent,
    adoptionLikelihood: hasReapPrecedent ? 85 : 55,
    partnershipOpportunities: buildPartnershipOpportunities(
      archResult,
      hasReapPrecedent,
      prunedWaferCount < originalWaferCount,
    ),
    marketSegments: buildMarketSegments(archResult),
    timeToValue: hasReapPrecedent ? "immediate" : "short-term",
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildDenseResult(archResult: ArchitectureScanResult): REAPResult {
  return {
    score: 50,
    revenueEstimate: 0,
    engagementPotential: 0,
    adoptionLikelihood: 0,
    partnershipOpportunities: [
      "Dense model — REAP applies to MoE only. Consider standard quantisation or distillation instead.",
    ],
    marketSegments: buildMarketSegments(archResult),
    timeToValue: "long-term",
  };
}

function buildPartnershipOpportunities(
  archResult: ArchitectureScanResult,
  hasReapPrecedent: boolean,
  waferReduction: boolean,
): string[] {
  const opportunities: string[] = [];

  if (hasReapPrecedent) {
    opportunities.push(
      "Collaborate with model provider on official REAP-pruned variant.",
    );
  }
  if (waferReduction) {
    opportunities.push(
      "Offer reduced-cost inference tier using pruned model.",
    );
  }
  opportunities.push(
    "Publish REAP benchmark results to attract MoE model developers.",
  );
  if (archResult.parameterCount > 100e9) {
    opportunities.push(
      "Enterprise deployment savings — large MoE models benefit most from expert pruning.",
    );
  }

  return opportunities;
}

function buildMarketSegments(archResult: ArchitectureScanResult): string[] {
  const segments: string[] = [];

  if (archResult.isMoE) {
    segments.push("MoE inference optimisation");
    segments.push("Cost-sensitive high-parameter deployments");
  }
  if (archResult.parameterCount > 50e9) {
    segments.push("Enterprise AI");
  }
  if (archResult.parameterCount < 15e9) {
    segments.push("Edge / on-device AI");
  }
  segments.push("Cloud inference providers");

  return segments;
}
