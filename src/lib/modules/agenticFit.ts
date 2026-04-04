// ---------------------------------------------------------------------------
// Agentic Fit Analysis Module
// ---------------------------------------------------------------------------
// Evaluates how well a model supports agentic workflows: tool calling,
// structured output, reasoning traces, long‑context, code generation, and
// multi‑turn coherence.
// ---------------------------------------------------------------------------

import type { AgenticFitResult } from "@/lib/types/model";

// ---- internal helpers -----------------------------------------------------

/** Tokens / substrings that indicate native tool‑call support. */
const TOOL_CALL_MARKERS = [
  "tool_call",
  "function_call",
  "tool_use",
  "<tool_call>",
  "<|tool_call|>",
] as const;

/** Tokens / substrings that indicate reasoning / chain‑of‑thought support. */
const REASONING_MARKERS = [
  "<think>",
  "<reasoning>",
  "thinking",
  "<|think|>",
] as const;

/** Structured output keywords in a model card. */
const STRUCTURED_OUTPUT_KEYWORDS = [
  "json mode",
  "structured output",
  "json_schema",
] as const;

/** Known benchmark patterns we try to extract from the model card. */
const BENCHMARK_PATTERNS: Record<string, RegExp> = {
  HumanEval: /HumanEval[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  LiveCodeBench: /LiveCodeBench[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  MMLU: /MMLU[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  GPQA: /GPQA[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  "MT-Bench": /MT[- ]?Bench[^0-9]*?(\d{1,2}(?:\.\d+)?)/i,
};

// ---- context window scoring -----------------------------------------------

function contextWindowScore(contextWindow: number): number {
  if (contextWindow >= 128_000) return 100;
  if (contextWindow >= 32_000) return 80;
  if (contextWindow >= 8_000) return 50;
  return 20;
}

// ---- capability detection -------------------------------------------------

function detectToolCalling(
  tokenizerConfig: any,
  chatTemplate: string,
): boolean {
  const blob = JSON.stringify(tokenizerConfig).toLowerCase();
  const hasMark = TOOL_CALL_MARKERS.some((m) => blob.includes(m.toLowerCase()));
  const templateHasToolRole = chatTemplate.toLowerCase().includes('"tool"');
  return hasMark || templateHasToolRole;
}

function detectStructuredOutput(modelCard: string): boolean {
  const lower = modelCard.toLowerCase();
  return STRUCTURED_OUTPUT_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectReasoning(tokenizerConfig: any): boolean {
  const blob = JSON.stringify(tokenizerConfig).toLowerCase();
  return REASONING_MARKERS.some((m) => blob.includes(m.toLowerCase()));
}

function extractBenchmarkScores(
  modelCard: string,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [name, re] of Object.entries(BENCHMARK_PATTERNS)) {
    const match = modelCard.match(re);
    if (match) {
      scores[name] = parseFloat(match[1]);
    }
  }
  return scores;
}

// ---- radar value computation ----------------------------------------------

interface RadarValues {
  tool_calling: number;
  structured_output: number;
  context_length: number;
  reasoning: number;
  code_quality: number;
  multi_turn: number;
}

function computeRadarValues(
  toolCalling: boolean,
  structuredOutput: boolean,
  hasReasoning: boolean,
  ctxScore: number,
  benchmarks: Record<string, number>,
): RadarValues {
  // Tool calling: binary capability with slight gradient
  const toolCallingScore = toolCalling ? 90 : 15;

  // Structured output
  const structuredOutputScore = structuredOutput ? 85 : 20;

  // Context length is already 0-100
  const contextLengthScore = ctxScore;

  // Reasoning
  const reasoningScore = hasReasoning ? 85 : 25;

  // Code quality – derive from HumanEval / LiveCodeBench if available
  let codeQualityScore = 40; // default
  if (benchmarks.HumanEval !== undefined) {
    codeQualityScore = Math.min(100, benchmarks.HumanEval);
  } else if (benchmarks.LiveCodeBench !== undefined) {
    codeQualityScore = Math.min(100, benchmarks.LiveCodeBench);
  }

  // Multi‑turn – derive from MT‑Bench if available, else heuristic
  let multiTurnScore = 45; // default
  if (benchmarks["MT-Bench"] !== undefined) {
    // MT-Bench is scored 1-10; normalise to 0-100
    multiTurnScore = Math.min(100, (benchmarks["MT-Bench"] / 10) * 100);
  }
  // Bonus: models with tool calling tend to handle multi‑turn better
  if (toolCalling) {
    multiTurnScore = Math.min(100, multiTurnScore + 10);
  }

  return {
    tool_calling: Math.round(toolCallingScore),
    structured_output: Math.round(structuredOutputScore),
    context_length: Math.round(contextLengthScore),
    reasoning: Math.round(reasoningScore),
    code_quality: Math.round(codeQualityScore),
    multi_turn: Math.round(multiTurnScore),
  };
}

// ---- main export ----------------------------------------------------------

/**
 * Analyse a model's fitness for agentic use‑cases (tool calling, structured
 * output, reasoning, long‑context, code generation, multi‑turn dialogue).
 *
 * @param tokenizerConfig - Parsed `tokenizer_config.json` from HuggingFace
 * @param modelCard       - Raw model card markdown (README.md)
 * @param contextWindow   - Maximum context length in tokens
 */
export async function runAgenticFit(
  tokenizerConfig: any,
  modelCard: string,
  contextWindow: number,
): Promise<AgenticFitResult> {
  // Extract chat_template string for tool‑role detection
  const chatTemplate: string =
    typeof tokenizerConfig?.chat_template === "string"
      ? tokenizerConfig.chat_template
      : "";

  // Detect capabilities
  const toolCallingSupported = detectToolCalling(tokenizerConfig, chatTemplate);
  const structuredOutputSupported = detectStructuredOutput(modelCard);
  const hasReasoningTokens = detectReasoning(tokenizerConfig);
  const ctxScore = contextWindowScore(contextWindow);

  // Benchmarks
  const benchmarkScores = extractBenchmarkScores(modelCard);

  // Radar
  const radar = computeRadarValues(
    toolCallingSupported,
    structuredOutputSupported,
    hasReasoningTokens,
    ctxScore,
    benchmarkScores,
  );

  // Weighted average across the six radar axes
  const radarWeights = {
    tool_calling: 0.25,
    structured_output: 0.15,
    context_length: 0.15,
    reasoning: 0.20,
    code_quality: 0.15,
    multi_turn: 0.10,
  };

  const overallScore = Math.round(
    Object.entries(radarWeights).reduce(
      (sum, [key, w]) => sum + radar[key as keyof RadarValues] * w,
      0,
    ),
  );

  // Build agentic use‑cases list
  const agenticUseCases: string[] = [];
  if (toolCallingSupported) agenticUseCases.push("Tool‑augmented agents");
  if (structuredOutputSupported) agenticUseCases.push("Structured data extraction");
  if (hasReasoningTokens) agenticUseCases.push("Chain‑of‑thought reasoning pipelines");
  if (ctxScore >= 80) agenticUseCases.push("Long‑document agents");
  if (radar.code_quality >= 60) agenticUseCases.push("Code generation & repair agents");
  if (radar.multi_turn >= 60) agenticUseCases.push("Multi‑step conversational agents");

  // Limitations
  const limitations: string[] = [];
  if (!toolCallingSupported) limitations.push("No native tool‑call support detected");
  if (!structuredOutputSupported) limitations.push("No structured output / JSON mode detected");
  if (!hasReasoningTokens) limitations.push("No explicit reasoning tokens");
  if (ctxScore <= 50) limitations.push("Limited context window may restrict agent memory");

  // Map radar values to the existing AgenticFitResult interface fields
  return {
    score: overallScore,
    toolUseCapability: radar.tool_calling,
    multiTurnCoherence: radar.multi_turn,
    instructionFollowing: radar.structured_output,
    codeGeneration: radar.code_quality,
    reasoningDepth: radar.reasoning,
    agenticUseCases,
    limitations,
  };
}
