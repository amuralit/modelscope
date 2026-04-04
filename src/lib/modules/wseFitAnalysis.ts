// ---------------------------------------------------------------------------
// WSE Fit Analysis Module
// ---------------------------------------------------------------------------
import type { ArchitectureScanResult, WSEFitResult } from "@/lib/types/model";
import { WSE3 } from "@/lib/constants/wseSpecs";

/** Bytes-per-parameter multipliers for each precision level. */
const PRECISION_MAP: Record<string, number> = {
  FP32: 4,
  FP16: 2,
  FP8: 1,
  FP4: 0.5,
};

const PRECISION_ORDER = ["FP32", "FP16", "FP8", "FP4"] as const;

interface PrecisionAnalysis {
  precision: string;
  bytes: number;
  fitsInSingleWafer: boolean;
  waferCount: number;
}

/**
 * Determine how well a model fits on the Cerebras WSE-3 at multiple precision
 * levels and estimate throughput.
 */
export async function runWSEFitAnalysis(
  archResult: ArchitectureScanResult,
): Promise<WSEFitResult> {
  const totalParams = archResult.parameterCount;
  const sramCapacity = WSE3.sram_capacity; // 44 GB in bytes

  // ---- Precision analysis --------------------------------------------------
  const precisionAnalysis: PrecisionAnalysis[] = PRECISION_ORDER.map(
    (precision) => {
      const bytesPerParam = PRECISION_MAP[precision];
      const bytes = totalParams * bytesPerParam;
      const waferCount = Math.ceil(bytes / sramCapacity);
      return {
        precision,
        bytes,
        fitsInSingleWafer: waferCount <= 1,
        waferCount,
      };
    },
  );

  // ---- Weight bytes at the "working" precision (FP16 as default) -----------
  const fp16Entry = precisionAnalysis.find((p) => p.precision === "FP16")!;
  const fp8Entry = precisionAnalysis.find((p) => p.precision === "FP8")!;
  const estimatedWeightBytes = fp16Entry.bytes;

  // ---- KV-cache estimation -------------------------------------------------
  // KV cache per token (FP16): 2 (K+V) × num_layers × num_kv_heads × head_dim × 2 bytes
  // We derive num_layers, num_kv_heads, head_dim from parameterCount heuristic
  // Since we only have the flat result, we estimate from parameterCount ranges.
  //
  // A more precise formula uses the original config.  Here we approximate:
  //   kv_cache_per_token ≈ 2 × hidden_size × num_layers × 2 bytes  (for MHA)
  //   With GQA the KV heads are fewer, so we apply a ratio.
  //
  // We'll derive hidden_size & num_layers from param count using typical ratios.

  // Use actual values from arch scan when available, fall back to estimates
  const actualHiddenSize = archResult.hiddenSize > 0 ? archResult.hiddenSize : estimateHiddenSize(totalParams);
  const actualNumLayers = archResult.numLayers > 0 ? archResult.numLayers : estimateNumLayers(totalParams);
  const actualNumKVHeads = archResult.numKVHeads > 0 ? archResult.numKVHeads : archResult.numAttentionHeads;
  const actualHeadDim = archResult.headDim > 0 ? archResult.headDim : 128;
  const kvRatio = archResult.attentionVariant === "MHA" ? 1.0
    : archResult.attentionVariant === "MQA" ? 0.05
    : (actualNumKVHeads > 0 && archResult.numAttentionHeads > 0)
      ? actualNumKVHeads / archResult.numAttentionHeads
      : 0.25;

  // Per-token KV cache in bytes (FP16): 2 (K+V) × layers × kv_heads × head_dim × 2 bytes
  const kvCachePerToken = 2 * actualNumLayers * actualNumKVHeads * actualHeadDim * 2;

  // Use actual context window or estimate from model size
  const maxContext = archResult.contextWindow > 0 ? archResult.contextWindow : estimateMaxContext(totalParams);
  const kvCacheAtMaxContext = kvCachePerToken * maxContext;

  // ---- Total memory required (FP16 weights + KV cache at max ctx) ----------
  const totalMemoryRequired = estimatedWeightBytes + kvCacheAtMaxContext;
  const fitsInSRAM = totalMemoryRequired <= sramCapacity;
  const sramUtilization = Math.min(1.0, totalMemoryRequired / sramCapacity);

  // ---- Bottleneck analysis -------------------------------------------------
  // memory-bound if weights dominate, compute-bound if model is small enough to
  // be fully resident and compute is the gating factor.
  let bottleneck: "compute" | "memory" | "none";
  if (!fitsInSRAM) {
    bottleneck = "memory";
  } else if (sramUtilization < 0.3) {
    bottleneck = "compute";
  } else {
    bottleneck = "none";
  }

  // ---- Estimated tokens per second -----------------------------------------
  const estimatedTps = estimateTokensPerSecond(totalParams);

  // ---- Score (0-100) -------------------------------------------------------
  const fp8Wafers = fp8Entry.waferCount;
  const fp16Wafers = fp16Entry.waferCount;

  let score: number;
  if (fp8Wafers <= 1) {
    score = 97;
  } else if (fp16Wafers <= 1) {
    score = 90;
  } else if (fp16Wafers <= 2) {
    score = 72;
  } else if (fp16Wafers <= 4) {
    score = 55;
  } else {
    score = 32;
  }

  // ---- Recommendations -----------------------------------------------------
  const recommendations: string[] = [];

  if (fp16Wafers > 1 && fp8Wafers <= 1) {
    recommendations.push(
      "Model exceeds single-wafer SRAM at FP16 but fits at FP8. Consider FP8 quantisation.",
    );
  }
  if (fp8Wafers > 1) {
    recommendations.push(
      `Model requires ${fp8Wafers} wafers even at FP8. Multi-wafer deployment or model pruning recommended.`,
    );
  }
  if (archResult.isMoE) {
    recommendations.push(
      "MoE architecture detected — only active expert weights need to be resident during inference, " +
        "which may reduce effective memory requirements.",
    );
  }
  if (kvCacheAtMaxContext > sramCapacity * 0.25) {
    recommendations.push(
      "KV cache at maximum context length consumes significant SRAM. Consider sliding-window or " +
        "chunked attention strategies.",
    );
  }
  if (fitsInSRAM) {
    recommendations.push(
      "Model fits entirely in WSE-3 SRAM — expect near-peak inference throughput.",
    );
  }

  // ---- Return result -------------------------------------------------------
  return {
    score,
    fitsInSRAM,
    sramUtilization,
    estimatedWeightBytes,
    estimatedKVCacheBytes: kvCacheAtMaxContext,
    totalMemoryRequired,
    availableSRAM: sramCapacity,
    bottleneck,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Rough hidden-size estimate from total parameter count. */
function estimateHiddenSize(params: number): number {
  if (params < 1e9) return 2048;
  if (params < 3e9) return 2560;
  if (params < 8e9) return 4096;
  if (params < 15e9) return 5120;
  if (params < 40e9) return 6144;
  if (params < 80e9) return 8192;
  if (params < 200e9) return 12288;
  return 16384;
}

/** Rough layer-count estimate from total parameter count. */
function estimateNumLayers(params: number): number {
  if (params < 1e9) return 24;
  if (params < 3e9) return 32;
  if (params < 8e9) return 32;
  if (params < 15e9) return 40;
  if (params < 40e9) return 48;
  if (params < 80e9) return 80;
  if (params < 200e9) return 96;
  return 126;
}

/** Estimate max context window from model size bracket. */
function estimateMaxContext(params: number): number {
  // Newer large models tend to have longer contexts; small models may vary.
  if (params < 3e9) return 4096;
  if (params < 15e9) return 8192;
  if (params < 80e9) return 32768;
  return 131072;
}

/** Estimate tokens/second based on parameter count (single WSE-3). */
function estimateTokensPerSecond(params: number): number {
  if (params < 10e9) return 2500;
  if (params < 30e9) return 2000;
  if (params < 70e9) return 1100;
  if (params < 200e9) return 700;
  return 400;
}
