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
  // Context window: check config, then common defaults by model family
  const rawContext = config.max_position_embeddings;
  const typeLower_ = (config.model_type ?? '').toLowerCase();
  const defaultContext = typeLower_.includes('gemma') ? 131072
    : typeLower_.includes('llama') ? 131072
    : typeLower_.includes('qwen') ? 40960
    : typeLower_.includes('mistral') ? 32768
    : 8192;
  const contextWindow = (rawContext && rawContext > 0) ? rawContext : defaultContext;
  const architectures = config.architectures ?? [];

  // ---- MoE detection -------------------------------------------------------
  const numExperts = config.num_local_experts ?? config.num_experts ?? config.n_routed_experts ?? 0;
  const isMoE = numExperts > 0;
  const numExpertsPerTok = config.num_experts_per_tok ?? 0;
  const firstKDenseReplace = config.first_k_dense_replace ?? 0;
  const nSharedExperts = config.n_shared_experts ?? 0;

  // Hybrid models (Mamba+Transformer like Nemotron-H, Jamba)
  // hybrid_override_pattern tells which layers are attention vs Mamba/SSM
  // e.g., "MMMAMMMA..." where M=Mamba, A=Attention
  const hybridPattern = config.hybrid_override_pattern ?? "";
  const isHybrid = hybridPattern.length > 0;
  let numAttnLayers = numLayers;
  let numMambaLayers = 0;
  if (isHybrid) {
    // Pattern chars: M=Mamba/SSM, E=attention(no MoE), *=attention+MoE, A=attention
    const patternLen = hybridPattern.length;
    if (patternLen === numLayers) {
      numMambaLayers = (hybridPattern.match(/M/g) || []).length;
      numAttnLayers = patternLen - numMambaLayers;
    } else if (patternLen > 0) {
      // Pattern doesn't match layer count — estimate
      const mRatio = (hybridPattern.match(/M/g) || []).length / Math.max(patternLen, 1);
      numMambaLayers = Math.round(numLayers * mRatio);
      numAttnLayers = numLayers - numMambaLayers;
    }
  }

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
  // Embeddings: input + output (or shared if tie_word_embeddings)
  const tiedEmbeddings = config.tie_word_embeddings ?? false;
  const embeddingParams = vocabSize * hiddenSize * (tiedEmbeddings ? 1 : 2);

  const qParams = hiddenSize * numAttentionHeads * headDim;
  const kParams = hiddenSize * numKVHeads * headDim;
  const vParams = hiddenSize * numKVHeads * headDim;
  const oParams = numAttentionHeads * headDim * hiddenSize;
  const attnParamsPerLayer = qParams + kParams + vParams + oParams;

  // MLP calculation depends on architecture type
  const moeIntermediateSize = config.moe_intermediate_size;
  const denseMlpParams = hiddenSize * intermediateSize * 3; // standard dense MLP

  let moeMlpParamsPerLayer: number; // for MoE layers
  if (isMoE && moeIntermediateSize && moeIntermediateSize > 0) {
    const expertMlpParams = hiddenSize * moeIntermediateSize * 3;
    const routerParams = hiddenSize * numExperts;
    // Shared experts (DeepSeek-style n_shared_experts, or intermediate != moe_intermediate)
    const sharedMlpParams = nSharedExperts > 0
      ? hiddenSize * moeIntermediateSize * 3 * nSharedExperts
      : (intermediateSize !== moeIntermediateSize ? denseMlpParams : 0);
    moeMlpParamsPerLayer = expertMlpParams * numExperts + routerParams + sharedMlpParams;
  } else if (isMoE) {
    const routerParams = hiddenSize * numExperts;
    moeMlpParamsPerLayer = hiddenSize * intermediateSize * 3 * numExperts + routerParams;
  } else {
    moeMlpParamsPerLayer = denseMlpParams;
  }

  // Handle layer types:
  // - first_k_dense_replace: first N layers are dense (no experts)
  // - hybrid: some layers are Mamba (lightweight, no attention or MoE)
  // - remaining: full attention + MoE
  const effectiveAttnLayers = isHybrid ? numAttnLayers : numLayers;
  const numDenseLayers = isMoE ? Math.min(firstKDenseReplace, effectiveAttnLayers) : effectiveAttnLayers;
  const numMoELayers = isMoE ? effectiveAttnLayers - numDenseLayers : 0;
  // Mamba layers are lightweight (~2 × hidden_size × expand × d_state per layer, ~small)
  const mambaParamsPerLayer = hiddenSize * 16 * 2; // rough estimate for Mamba block

  const totalParams =
    embeddingParams +
    numMambaLayers * mambaParamsPerLayer +
    numDenseLayers * (attnParamsPerLayer + denseMlpParams) +
    numMoELayers * (attnParamsPerLayer + moeMlpParamsPerLayer);

  // Active parameters (for MoE, only active experts fire per token)
  let activeParams = totalParams;
  if (isMoE && numExperts > 0 && numExpertsPerTok > 0) {
    const activeExpertSize = moeIntermediateSize && moeIntermediateSize > 0 ? moeIntermediateSize : intermediateSize;
    const activeMlpPerLayer =
      hiddenSize * activeExpertSize * 3 * numExpertsPerTok +
      hiddenSize * numExperts + // router always active
      (nSharedExperts > 0
        ? hiddenSize * activeExpertSize * 3 * nSharedExperts
        : (moeIntermediateSize && intermediateSize !== moeIntermediateSize ? denseMlpParams : 0));
    activeParams =
      embeddingParams +
      numMambaLayers * mambaParamsPerLayer +
      numDenseLayers * (attnParamsPerLayer + denseMlpParams) +
      numMoELayers * (attnParamsPerLayer + activeMlpPerLayer);
  }

  // ---- Supported features --------------------------------------------------
  const supportedFeatures: string[] = [];
  if (config.rope_theta !== undefined) supportedFeatures.push("RoPE");
  if (attentionType === "GQA") supportedFeatures.push("Grouped-Query Attention");
  if (attentionType === "MQA") supportedFeatures.push("Multi-Query Attention");
  if (isMoE) supportedFeatures.push("Mixture-of-Experts");
  if (isHybrid) supportedFeatures.push(`Hybrid (${numAttnLayers} attn + ${numMambaLayers} Mamba)`);
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
    typeLower.includes("nemotron") ||
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
