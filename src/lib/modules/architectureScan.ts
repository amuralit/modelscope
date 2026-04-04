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
  const numLayers = config.num_hidden_layers;
  const numAttentionHeads = config.num_attention_heads;
  const numKVHeads = config.num_key_value_heads ?? numAttentionHeads;
  const hiddenSize = config.hidden_size;
  const intermediateSize = config.intermediate_size;
  const vocabSize = config.vocab_size;
  const contextWindow = config.max_position_embeddings;
  const architectures = config.architectures ?? [];

  // ---- MoE detection -------------------------------------------------------
  const isMoE =
    config.num_local_experts !== undefined && config.num_local_experts > 0;
  const numExperts = config.num_local_experts ?? 0;
  const numExpertsPerTok = config.num_experts_per_tok ?? 0;

  // ---- Attention variant ---------------------------------------------------
  let attentionType: "MHA" | "GQA" | "MQA";
  if (numKVHeads === 1) {
    attentionType = "MQA";
  } else if (numKVHeads < numAttentionHeads) {
    attentionType = "GQA";
  } else {
    attentionType = "MHA";
  }

  // ---- Head dimension ------------------------------------------------------
  const headDim = Math.floor(hiddenSize / numAttentionHeads);

  // ---- Parameter estimation ------------------------------------------------
  // Embedding layers (input + output / tied LM head)
  const embeddingParams = vocabSize * hiddenSize * 2;

  // Self-attention per layer: Q, K, V projections + output projection
  // Q: hidden_size -> num_attention_heads * head_dim  (= hidden_size * hidden_size)
  // K: hidden_size -> num_kv_heads * head_dim
  // V: hidden_size -> num_kv_heads * head_dim
  // O: num_attention_heads * head_dim -> hidden_size (= hidden_size * hidden_size)
  const qParams = hiddenSize * numAttentionHeads * headDim;
  const kParams = hiddenSize * numKVHeads * headDim;
  const vParams = hiddenSize * numKVHeads * headDim;
  const oParams = numAttentionHeads * headDim * hiddenSize;
  const attnParamsPerLayer = qParams + kParams + vParams + oParams;

  // MLP per layer: gate_proj + up_proj + down_proj
  // gate: hidden_size -> intermediate_size
  // up:   hidden_size -> intermediate_size
  // down: intermediate_size -> hidden_size
  let mlpParamsPerLayer = hiddenSize * intermediateSize * 3;

  // For MoE: each expert has its own MLP, plus a small router
  if (isMoE) {
    const routerParams = hiddenSize * numExperts; // router linear
    mlpParamsPerLayer = mlpParamsPerLayer * numExperts + routerParams;
  }

  const totalParams =
    embeddingParams + numLayers * (attnParamsPerLayer + mlpParamsPerLayer);

  // Active parameters (for MoE, only a subset of experts fire per token)
  let activeParams = totalParams;
  if (isMoE && numExperts > 0 && numExpertsPerTok > 0) {
    const activeMlpPerLayer =
      hiddenSize * intermediateSize * 3 * numExpertsPerTok +
      hiddenSize * numExperts; // router is always active
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
  if (numKVHeads > numAttentionHeads) {
    warnings.push(
      "num_key_value_heads > num_attention_heads — config may be invalid",
    );
  }
  if (hiddenSize % numAttentionHeads !== 0) {
    warnings.push(
      "hidden_size is not evenly divisible by num_attention_heads",
    );
  }
  if (isMoE && numExpertsPerTok === 0) {
    warnings.push(
      "MoE model detected but num_experts_per_tok is missing or 0",
    );
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
    typeLower.includes("deepseek")
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
    // MoE standard architectures
    if (isStandardTransformer) {
      score = 70 + Math.round(Math.random() * 15); // 70-85
    } else {
      score = 40 + Math.round(Math.random() * 20); // 40-60 novel/hybrid
    }
  } else if (isStandardTransformer) {
    // Dense standard transformer
    score = 85 + Math.round(Math.random() * 10); // 85-95
  } else if (architectureFamily === "OtherTransformer") {
    // Novel / hybrid architecture
    score = 40 + Math.round(Math.random() * 20); // 40-60
  } else {
    // Completely unknown
    score = 30 + Math.round(Math.random() * 10); // 30-40
  }

  // Bonus: GQA/MQA are well-supported on Cerebras
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
  };
}
