// ---------------------------------------------------------------------------
// Agentic Fit Analysis Module
// ---------------------------------------------------------------------------

import type { AgenticFitResult } from "@/lib/types/model";

// ---- known model family capabilities ----------------------------------------

/** Well-known model families and their known capabilities. */
const KNOWN_CAPABILITIES: Record<string, {
  toolCalling?: boolean;
  structuredOutput?: boolean;
  reasoning?: boolean;
  codeQuality?: number;
  multiTurn?: number;
}> = {
  gemma: { toolCalling: true, structuredOutput: true, codeQuality: 65, multiTurn: 70 },
  llama: { toolCalling: true, structuredOutput: true, codeQuality: 60, multiTurn: 65 },
  qwen: { toolCalling: true, structuredOutput: true, codeQuality: 75, multiTurn: 70 },
  mistral: { toolCalling: true, structuredOutput: true, codeQuality: 65, multiTurn: 65 },
  deepseek: { toolCalling: true, structuredOutput: true, reasoning: true, codeQuality: 80, multiTurn: 70 },
  phi: { toolCalling: true, structuredOutput: true, codeQuality: 70, multiTurn: 60 },
  command: { toolCalling: true, structuredOutput: true, multiTurn: 70 },
};

function getKnownCapabilities(modelCard: string, modelType: string) {
  const lower = (modelCard + " " + modelType).toLowerCase();
  for (const [family, caps] of Object.entries(KNOWN_CAPABILITIES)) {
    if (lower.includes(family)) return caps;
  }
  return null;
}

// ---- detection helpers ------------------------------------------------------

const TOOL_CALL_MARKERS = [
  "tool_call", "function_call", "tool_use", "<tool_call>", "<|tool_call|>",
  "function calling", "tool calling", "tool use",
] as const;

const REASONING_MARKERS = [
  "<think>", "<reasoning>", "thinking", "<|think|>",
  "chain-of-thought", "chain of thought", "reasoning tokens",
] as const;

const STRUCTURED_OUTPUT_KEYWORDS = [
  "json mode", "structured output", "json_schema", "json output",
  "structured generation", "constrained decoding", "function calling",
] as const;

function contextWindowScore(contextWindow: number): number {
  if (contextWindow >= 128_000) return 100;
  if (contextWindow >= 32_000) return 80;
  if (contextWindow >= 8_000) return 50;
  return 20;
}

function detectToolCalling(
  tokenizerConfig: any,
  chatTemplate: string,
  modelCard: string,
): boolean {
  const tokBlob = JSON.stringify(tokenizerConfig).toLowerCase();
  const cardLower = modelCard.toLowerCase();
  const combined = tokBlob + " " + chatTemplate.toLowerCase() + " " + cardLower;
  return TOOL_CALL_MARKERS.some((m) => combined.includes(m.toLowerCase()));
}

function detectStructuredOutput(modelCard: string, tokenizerConfig: any): boolean {
  const combined = (modelCard + " " + JSON.stringify(tokenizerConfig)).toLowerCase();
  return STRUCTURED_OUTPUT_KEYWORDS.some((kw) => combined.includes(kw));
}

function detectReasoning(tokenizerConfig: any, modelCard: string): boolean {
  const combined = (JSON.stringify(tokenizerConfig) + " " + modelCard).toLowerCase();
  return REASONING_MARKERS.some((m) => combined.includes(m.toLowerCase()));
}

function detectContextFromCard(modelCard: string): number | null {
  // Try to find context window mentions in model card
  const patterns = [
    /(\d{2,3})[kK]\s*(?:context|token|ctx)/,
    /context\s*(?:window|length)?\s*(?:of\s+)?(\d[\d,]*)\s*tokens/i,
    /(\d{2,3}),?000\s*tokens/,
    /(\d+)[kK]\s+context/i,
  ];
  for (const p of patterns) {
    const m = modelCard.match(p);
    if (m) {
      const val = parseInt(m[1].replace(/,/g, ""));
      if (val >= 1 && val <= 1000) return val * 1000; // e.g., "128K" → 128000
      if (val > 1000) return val; // already in tokens
    }
  }
  return null;
}

const BENCHMARK_PATTERNS: Record<string, RegExp> = {
  HumanEval: /HumanEval[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  LiveCodeBench: /LiveCodeBench[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  MMLU: /MMLU[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  GPQA: /GPQA[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
  "MT-Bench": /MT[- ]?Bench[^0-9]*?(\d{1,2}(?:\.\d+)?)/i,
};

function extractBenchmarkScores(modelCard: string): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [name, re] of Object.entries(BENCHMARK_PATTERNS)) {
    const match = modelCard.match(re);
    if (match) scores[name] = parseFloat(match[1]);
  }
  return scores;
}

// ---- main export ----------------------------------------------------------

export async function runAgenticFit(
  tokenizerConfig: any,
  modelCard: string,
  contextWindow: number,
): Promise<AgenticFitResult> {
  const chatTemplate: string =
    typeof tokenizerConfig?.chat_template === "string"
      ? tokenizerConfig.chat_template
      : "";

  // Get known capabilities for this model family
  const modelType = tokenizerConfig?.model_type ?? "";
  const knownCaps = getKnownCapabilities(modelCard, modelType);

  // Detect capabilities (combine detection + known family data)
  const toolCallingDetected = detectToolCalling(tokenizerConfig, chatTemplate, modelCard);
  const structuredOutputDetected = detectStructuredOutput(modelCard, tokenizerConfig);
  const reasoningDetected = detectReasoning(tokenizerConfig, modelCard);

  const toolCallingSupported = toolCallingDetected || (knownCaps?.toolCalling ?? false);
  const structuredOutputSupported = structuredOutputDetected || (knownCaps?.structuredOutput ?? false);
  const hasReasoningTokens = reasoningDetected || (knownCaps?.reasoning ?? false);

  // Context window: use provided value, try model card, fall back to default
  const cardContext = detectContextFromCard(modelCard);
  const effectiveContext = contextWindow > 8192 ? contextWindow : (cardContext ?? contextWindow);
  const ctxScore = contextWindowScore(effectiveContext);

  // Benchmarks
  const benchmarks = extractBenchmarkScores(modelCard);

  // Compute radar values
  const toolCallingScore = toolCallingSupported ? 85 : 15;
  const structuredOutputScore = structuredOutputSupported ? 80 : 20;
  const reasoningScore = hasReasoningTokens ? 85 : 40;

  let codeQualityScore = knownCaps?.codeQuality ?? 40;
  if (benchmarks.HumanEval !== undefined) codeQualityScore = Math.min(100, benchmarks.HumanEval);
  else if (benchmarks.LiveCodeBench !== undefined) codeQualityScore = Math.min(100, benchmarks.LiveCodeBench);

  let multiTurnScore = knownCaps?.multiTurn ?? 45;
  if (benchmarks["MT-Bench"] !== undefined) {
    multiTurnScore = Math.min(100, (benchmarks["MT-Bench"] / 10) * 100);
  }
  if (toolCallingSupported) multiTurnScore = Math.min(100, multiTurnScore + 10);

  const radar = {
    tool_calling: Math.round(toolCallingScore),
    structured_output: Math.round(structuredOutputScore),
    context_length: Math.round(ctxScore),
    reasoning: Math.round(reasoningScore),
    code_quality: Math.round(codeQualityScore),
    multi_turn: Math.round(multiTurnScore),
  };

  // Weighted average
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
      (sum, [key, w]) => sum + radar[key as keyof typeof radar] * w,
      0,
    ),
  );

  // Build use cases
  const agenticUseCases: string[] = [];
  if (toolCallingSupported) agenticUseCases.push("Tool-augmented agents");
  if (structuredOutputSupported) agenticUseCases.push("Structured data extraction");
  if (hasReasoningTokens) agenticUseCases.push("Chain-of-thought reasoning pipelines");
  if (ctxScore >= 80) agenticUseCases.push("Long-document agents");
  if (codeQualityScore >= 60) agenticUseCases.push("Code generation & repair agents");
  if (multiTurnScore >= 60) agenticUseCases.push("Multi-step conversational agents");

  const limitations: string[] = [];
  if (!toolCallingSupported) limitations.push("No native tool-call support detected");
  if (!structuredOutputSupported) limitations.push("No structured output / JSON mode detected");
  if (!hasReasoningTokens) limitations.push("No explicit reasoning tokens");
  if (ctxScore <= 50) limitations.push("Limited context window may restrict agent memory");

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
