// ---------------------------------------------------------------------------
// ModelScope – core TypeScript types
// ---------------------------------------------------------------------------

/** HuggingFace config.json fields relevant to architecture analysis. */
export interface ModelConfig {
  model_type: string;
  num_hidden_layers: number;
  num_attention_heads: number;
  num_key_value_heads?: number;
  hidden_size: number;
  intermediate_size: number;
  vocab_size?: number;
  max_position_embeddings?: number;
  num_local_experts?: number;
  num_experts?: number;
  num_experts_per_tok?: number;
  moe_intermediate_size?: number;
  n_routed_experts?: number;
  first_k_dense_replace?: number;
  n_shared_experts?: number;
  tie_word_embeddings?: boolean;
  hybrid_override_pattern?: string;
  expand?: number;
  ssm_state_size?: number;
  mamba_num_heads?: number;
  mamba_head_dim?: number;
  conv_kernel?: number;
  n_groups?: number;
  rope_theta?: number;
  torch_dtype?: string;
  architectures?: string[];
  head_dim?: number;
  // Nested configs (multimodal models like Gemma 3)
  text_config?: Partial<ModelConfig>;
  vision_config?: Record<string, unknown>;
}

/** Subset of HuggingFace Hub model metadata returned by the API. */
export interface ModelInfo {
  id: string;
  author?: string;
  downloads: number;
  downloadsLastMonth: number;
  likes: number;
  createdAt: string;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
  modelId: string;
  trendingScore?: number;
}

// ---------------------------------------------------------------------------
// Analysis‑module result types  (every result carries a 0‑100 score)
// ---------------------------------------------------------------------------

export interface ArchitectureScanResult {
  score: number;
  modelType: string;
  parameterCount: number;
  architectureFamily: string;
  isMoE: boolean;
  activeParameters?: number;
  totalParameters?: number;
  attentionVariant: string; // "MHA" | "GQA" | "MQA"
  supportedFeatures: string[];
  warnings: string[];
  // Detailed fields for dashboard visualizations
  numLayers: number;
  numAttentionHeads: number;
  numKVHeads: number;
  hiddenSize: number;
  intermediateSize: number;
  headDim: number;
  vocabSize: number;
  contextWindow: number;
  numExperts: number;
  numExpertsPerTok: number;
}

export interface WSEFitResult {
  score: number;
  fitsInSRAM: boolean;
  sramUtilization: number;
  estimatedWeightBytes: number;
  estimatedKVCacheBytes: number;
  totalMemoryRequired: number;
  availableSRAM: number;
  bottleneck: "compute" | "memory" | "none";
  recommendations: string[];
}

export interface SpeedSensitivityResult {
  score: number;
  estimatedTokensPerSecond: number;
  latencyCategory: "ultra-low" | "low" | "medium" | "high";
  speedupOverGPU: number;
  primaryUseCases: string[];
  latencySensitiveWorkloads: string[];
  throughputEstimate: number;
}

export interface REAPResult {
  score: number;
  revenueEstimate: number;
  engagementPotential: number;
  adoptionLikelihood: number;
  partnershipOpportunities: string[];
  marketSegments: string[];
  timeToValue: "immediate" | "short-term" | "medium-term" | "long-term";
}

export interface AgenticFitResult {
  score: number;
  toolUseCapability: number;
  multiTurnCoherence: number;
  instructionFollowing: number;
  codeGeneration: number;
  reasoningDepth: number;
  agenticUseCases: string[];
  limitations: string[];
}

export interface CompetitiveGapResult {
  score: number;
  competitorsOffering: string[];
  uniqueAdvantage: boolean;
  marketGapSize: "large" | "medium" | "small" | "none";
  differentiators: string[];
  riskOfNotOffering: "high" | "medium" | "low";
  timelinePressure: "urgent" | "moderate" | "low";
  providers: {
    name: string;
    serves_model: boolean;
    estimated_speed: number;
    input_price: number;
    output_price: number;
  }[];
  speedAdvantageMultiplier: number;
  onCerebras: boolean;
  estimatedCerebrasSpeed: number;
}

export interface DemandSignalResult {
  score: number;
  downloadsLastMonth: number;
  downloadsTrend: "rising" | "stable" | "declining";
  communityInterest: number;
  enterpriseInquiries: number;
  socialMentions: number;
  searchVolume: number;
  topRequestingSegments: string[];
}

// ---------------------------------------------------------------------------
// Pipeline / orchestration types
// ---------------------------------------------------------------------------

export type ModuleStatusState = "pending" | "running" | "completed" | "error";

export interface ModuleStatus {
  name: string;
  status: ModuleStatusState;
  elapsed?: number;
  result?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface CompositeScore {
  score: number;
  verdict: "GO" | "EVALUATE" | "SKIP";
  breakdown: Record<
    string,
    { score: number; weight: number; weighted: number }
  >;
}

export interface ScoringWeights {
  architecture: number;
  wseFit: number;
  speedSensitivity: number;
  agenticFit: number;
  competitiveGap: number;
  demandSignal: number;
  reapPotential: number;
}

// ---------------------------------------------------------------------------
// Manual entry & configuration
// ---------------------------------------------------------------------------

/** Fields a user can supply when a HuggingFace config is unavailable. */
export interface ManualModelSpec {
  modelName: string;
  modelType: string;
  parameterCount: number;
  numHiddenLayers: number;
  numAttentionHeads: number;
  numKeyValueHeads?: number;
  hiddenSize: number;
  intermediateSize: number;
  vocabSize: number;
  maxPositionEmbeddings: number;
  isMoE: boolean;
  numLocalExperts?: number;
  numExpertsPerTok?: number;
  torchDtype?: string;
}

/** Optional API keys for external services. */
export interface APIKeys {
  huggingface?: string;
  cerebras?: string;
  anthropic?: string;
}
