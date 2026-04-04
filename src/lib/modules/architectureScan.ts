// ---------------------------------------------------------------------------
// Architecture Scan Module
// ---------------------------------------------------------------------------
import type {
  ModelConfig,
  ArchitectureScanResult,
} from "@/lib/types/model";

/**
 * Analyse a HuggingFace ModelConfig and derive architectural properties,
 * estimated parameter count, and a compatibility score (0-100).
 */
export async function runArchitectureScan(
  config: ModelConfig,
): Promise<ArchitectureScanResult> {
  // ---- Basic fields (with safe defaults) -----------------------------------
  const modelType = config.model_type ?? "unknown";
  const numLayers = config.num_hidden_layers ?? 0;
  const numAttentionHeads = config.num_attention_heads ?? 0;
  const numKVHeads = config.num_key_value_heads ?? numAttentionHeads;
  const hiddenSize = config.hidden_size ?? 0;
  const intermediateSize = config.intermediate_size ?? 0;
  const vocabSize = config.vocab_size ?? 256000; // sensible default
  const contextWindow = config.max_position_embeddings ?? 8192; // sensible default
  const architectures = config.architectures ?? [];

  // ---- MoE detection -------------------------------------------------------
  const numExperts = config.num_local_experts ?? config.num_experts ?? 0;
  const isMoE = numExperts > 0;
  const numExpertsPerTok = config.num_experts_per_tok ?? 0;

  // ---- Attention variant ---------------------------------------------------
  let attentionType: "MHA" | "GQA" | "MQA";
  if (numAttentionHeads === 0) {
    attentionType = "MHA";
  } else if (numKVHeads === 1) {
    attentionType = "MQA";
  } else if (numKVHeads < numAttentionHeads) {
    attentionType = "GQA";
  } else {
    attentionType = "MHA";
  }

  // ---- Head dimension ------------------------------------------------------
  const headDim =
    config.head_dim ??
    (numAttentionHeads > 0 ? Math.floor(hiddenSize / numAttentionHeads) : 0);

  // ---- Parameter estimation ------------------------------------------------
  const embeddingParams = vocabSize * hiddenSize * 2;

  const qParams = hiddenSize * numAttentionHeads * headDim;
  const kParams = hiddenSize * numKVHeads * headDim;
  const vParams = hiddenSize * numKVHeads * headDim;
  const oParams = numAttentionHeads * headDim * hiddenSize;
  const attnParamsPerLayer = qParams + kParams + vParams + oParams;

  let mlpParamsPerLayer = hiddenSize * intermediateSize * 3;

  if (isMoE) {
    const routerParams = hiddenSize * numExperts;
    mlpParamsPerLayer = mlpParamsPerLayer * numExperts + routerParams;
  }

  const totalParams =
    embeddingParams + numLayers * (attnParamsPerLayer + mlpParamsPerLayer);

  let activeParams = totalParams;
  if (isMoE && numExperts > 0 && numExpertsPerTok > 0) {
    const activeMlpPerLayer =
      hiddenSize * intermediateSize * 3 * numExpertsPerTok +
      hiddenSize * numExperts;
    activeParams =
      embeddingParams + numLayers * (attnParamsPerLayer + activeMlpPerLayer);
  }

  // ---- Supported features --------------------------------------------------
  const supportedFeatures: string[] = [];
  if (config.rope_theta !== undefined) supportedFeatures.push("RoPE");
  if (attentionType === "GQA") supportedFeatures.push("Grouped-Query Attention");
  if (attentionType === "MQA") supportedFeatures.push("Multi-Query Attention");
  if (isMoE) supportedFeatures.push("Mixture-of-Experts");
  if (contextWindow >= 128_000) supportedFeatures.push("Long Context (128k+)");
  else if (contextWindow >= 32_000) supportedFeatures.push("Extended Context (32k+)");

  // ---- Warnings ------------------------------------------------------------
  const warnings: string[] = [];
  if (numLayers === 0) {
    warnings.push("num_hidden_layers is 0 or missing — config may be incomplete");
  }
  if (numKVHeads > numAttentionHeads && numAttentionHeads > 0) {
    warnings.push("num_key_value_heads > num_attention_heads — config may be invalid");
  }
  if (hiddenSize > 0 && numAttentionHeads > 0 && hiddenSize % numAttentionHeads !== 0) {
    warnings.push("hidden_size is not evenly divisible by num_attention_heads");
  }
  if (isMoE && numExpertsPerTok === 0) {
    warnings.push("MoE model detected but num_experts_per_tok is missing or 0");
  }

  // ---- Architecture family classification ----------------------------------
  const archLower = architectures.map((a) => a.toLowerCase()).join(" ");
  const typeLower = modelType.toLowerCase();
  let architectureFamily = "Unknown";

  if (
    archLower.includes("llama") ||
    typeLower.includes("llama") ||
    typeLower.includes("mistral") ||
    typeLower.includes("qwen") ||
    typeLower.includes("gemma") ||
    typeLower.includes("phi") ||
    typeLower.includes("deepseek") ||
    typeLower.includes("internlm") ||
    typeLower.includes("yi")
  ) {
    architectureFamily = "LlamaFamily";
  } else if (typeLower.includes("gpt2") || typeLower.includes("gpt_neo")) {
    architectureFamily = "GPT2Family";
  } else if (typeLower.includes("falcon")) {
    architectureFamily = "FalconFamily";
  } else if (typeLower.includes("mpt")) {
    architectureFamily = "MPTFamily";
  } else if (
    typeLower.includes("bert") ||
    typeLower.includes("roberta") ||
    typeLower.includes("deberta")
  ) {
    architectureFamily = "BERTFamily";
  } else if (typeLower.includes("t5") || typeLower.includes("bart")) {
    architectureFamily = "EncoderDecoderFamily";
  } else if (archLower.length > 0) {
    architectureFamily = "OtherTransformer";
  }

  // ---- Score (0-100) -------------------------------------------------------
  let score: number;

  const isStandardTransformer =
    architectureFamily !== "Unknown" && architectureFamily !== "OtherTransformer";

  if (isMoE) {
    score = isStandardTransformer ? 78 : 50;
  } else if (isStandardTransformer) {
    score = 89;
  } else if (architectureFamily === "OtherTransformer") {
    score = 50;
  } else {
    score = 35;
  }

  // Bonus: GQA/MQA
  if (attentionType === "GQA") score = Math.min(100, score + 3);
  if (attentionType === "MQA") score = Math.min(100, score + 2);

  // ---- Return result -------------------------------------------------------
  return {
    score,
    modelType,
    parameterCount: totalParams,
    architectureFamily,
    isMoE,
    activeParameters: isMoE ? activeParams : undefined,
    totalParameters: totalParams,
    attentionVariant: attentionType,
    supportedFeatures,
    warnings,
    // Extra fields the dashboard uses
    numLayers,
    numAttentionHeads,
    numKVHeads,
    hiddenSize,
    intermediateSize,
    headDim,
    vocabSize,
    contextWindow,
    numExperts: isMoE ? numExperts : 0,
    numExpertsPerTok: isMoE ? numExpertsPerTok : 0,
  };
}
