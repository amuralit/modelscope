// ---------------------------------------------------------------------------
// Cerebras WSE‑3 (Wafer‑Scale Engine 3) hardware specifications
// ---------------------------------------------------------------------------

export interface WSESpec {
  /** On‑chip SRAM capacity in bytes. */
  sram_capacity: number;
  /** Aggregate memory bandwidth in bytes per second. */
  memory_bandwidth: number;
  /** Peak compute throughput in petaFLOPS (FP16 / BF16). */
  compute_petaflops: number;
  /** Total transistor count. */
  transistors: number;
  /** Number of processing cores on the wafer. */
  cores: number;
}

export const WSE3: WSESpec = {
  sram_capacity: 44 * 1024 ** 3, // 44 GB
  memory_bandwidth: 21e15, // 21 PB/s
  compute_petaflops: 125, // 125 PFLOPS
  transistors: 4e12, // 4 trillion
  cores: 900_000, // 900 k cores
} as const;

// Convenience derived values
/** SRAM capacity expressed in gigabytes. */
export const WSE3_SRAM_GB = 44;
/** Memory bandwidth expressed in petabytes per second. */
export const WSE3_BANDWIDTH_PBS = 21;
