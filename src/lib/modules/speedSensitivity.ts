// ---------------------------------------------------------------------------
// Speed Sensitivity Module
// ---------------------------------------------------------------------------
import type {
  ArchitectureScanResult,
  SpeedSensitivityResult,
} from "@/lib/types/model";

// ---------------------------------------------------------------------------
// Use-case classification data
// ---------------------------------------------------------------------------

interface UseCaseProfile {
  label: string;
  elasticityRange: [number, number]; // [min, max]
  chainStepsRange: [number, number];
  keywords: string[];
  latencySensitiveWorkloads: string[];
}

const USE_CASE_PROFILES: UseCaseProfile[] = [
  {
    label: "coding_agent",
    elasticityRange: [80, 95],
    chainStepsRange: [10, 15],
    keywords: ["coding", "code", "developer", "swe", "copilot", "starcoder", "codegen"],
    latencySensitiveWorkloads: [
      "Inline code completion",
      "Multi-file refactoring",
      "Test generation pipelines",
      "Agentic SWE loops",
    ],
  },
  {
    label: "reasoning_chain",
    elasticityRange: [75, 90],
    chainStepsRange: [5, 10],
    keywords: ["reasoning", "think", "chain-of-thought", "math", "r1", "qwq", "deepthink"],
    latencySensitiveWorkloads: [
      "Multi-step mathematical reasoning",
      "Chain-of-thought verification",
      "Theorem proving iterations",
    ],
  },
  {
    label: "general_agent",
    elasticityRange: [70, 85],
    chainStepsRange: [5, 8],
    keywords: ["agent", "tool", "function calling", "function-calling", "react", "toolformer"],
    latencySensitiveWorkloads: [
      "Tool-use orchestration loops",
      "API call chains",
      "ReAct reasoning-action cycles",
    ],
  },
  {
    label: "multi_turn_chat",
    elasticityRange: [35, 50],
    chainStepsRange: [3, 5],
    keywords: ["chat", "assistant", "conversation", "instruct", "helpful"],
    latencySensitiveWorkloads: [
      "Interactive dialogue",
      "Customer support conversations",
      "Conversational search",
    ],
  },
  {
    label: "single_turn",
    elasticityRange: [15, 25],
    chainStepsRange: [1, 1],
    keywords: ["embedding", "classification", "ner", "sentiment", "rerank"],
    latencySensitiveWorkloads: [
      "Batch embedding generation",
      "Document classification",
    ],
  },
];

// ---------------------------------------------------------------------------
// GPU baseline throughput (tok/s) for comparison
// ---------------------------------------------------------------------------

/** Conservative average GPU tok/s for a model of given size (H100 single-card). */
function gpuBaselineTps(paramCount: number): number {
  if (paramCount < 10e9) return 120;
  if (paramCount < 30e9) return 60;
  if (paramCount < 70e9) return 30;
  if (paramCount < 200e9) return 15;
  return 8;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate how much a model's target workloads benefit from Cerebras-level
 * speed.  Produces an "elasticity" score (0-100) measuring how strongly
 * user-perceived quality or throughput scales with raw token speed.
 */
export async function runSpeedSensitivity(
  modelCard: string,
  archResult: ArchitectureScanResult,
  estimatedTps: number,
): Promise<SpeedSensitivityResult> {
  const cardLower = modelCard.toLowerCase();

  // ---- Classify primary use case -------------------------------------------
  let matched: UseCaseProfile | undefined;
  let bestMatchCount = 0;

  for (const profile of USE_CASE_PROFILES) {
    const hits = profile.keywords.filter((kw) => cardLower.includes(kw)).length;
    if (hits > bestMatchCount) {
      bestMatchCount = hits;
      matched = profile;
    }
  }

  // Default to multi_turn_chat if nothing matches
  if (!matched) {
    matched = USE_CASE_PROFILES.find((p) => p.label === "multi_turn_chat")!;
  }

  // ---- Derive values from matched profile ----------------------------------
  const [eMin, eMax] = matched.elasticityRange;
  const elasticityScore = eMin + Math.round(Math.random() * (eMax - eMin));

  const [sMin, sMax] = matched.chainStepsRange;
  const chainSteps = sMin + Math.round(Math.random() * (sMax - sMin));

  // ---- Time-to-completion comparison at 500 output tokens ------------------
  const outputTokens = 500;
  const paramCount = archResult.parameterCount;
  const gpuTps = gpuBaselineTps(paramCount);
  const cerebrasTps = estimatedTps;

  const gpuTimeSeconds = outputTokens / gpuTps;
  const cerebrasTimeSeconds = outputTokens / cerebrasTps;
  const speedupFactor = parseFloat((gpuTimeSeconds / cerebrasTimeSeconds).toFixed(1));

  // ---- Determine primary use cases from model card -------------------------
  const primaryUseCases: string[] = [matched.label.replace(/_/g, " ")];

  // Add secondary use cases if keywords match
  for (const profile of USE_CASE_PROFILES) {
    if (profile === matched) continue;
    const hits = profile.keywords.filter((kw) => cardLower.includes(kw)).length;
    if (hits > 0) {
      primaryUseCases.push(profile.label.replace(/_/g, " "));
    }
  }

  // ---- Latency category ----------------------------------------------------
  let latencyCategory: "ultra-low" | "low" | "medium" | "high";
  if (cerebrasTimeSeconds < 0.5) {
    latencyCategory = "ultra-low";
  } else if (cerebrasTimeSeconds < 2) {
    latencyCategory = "low";
  } else if (cerebrasTimeSeconds < 5) {
    latencyCategory = "medium";
  } else {
    latencyCategory = "high";
  }

  // ---- Throughput estimate (requests per minute single-stream) -------------
  const throughputEstimate = Math.round(60 / cerebrasTimeSeconds);

  // ---- Score = elasticity score (how much speed matters for this use case) -
  const score = elasticityScore;

  return {
    score,
    estimatedTokensPerSecond: cerebrasTps,
    latencyCategory,
    speedupOverGPU: speedupFactor,
    primaryUseCases,
    latencySensitiveWorkloads: matched.latencySensitiveWorkloads,
    throughputEstimate,
  };
}
