// ---------------------------------------------------------------------------
// Cerebras inference‑cloud model catalog (current as of April 2026)
// ---------------------------------------------------------------------------

export interface CerebrasModel {
  /** Identifier used in the Cerebras API. */
  id: string;
  /** Human‑readable display name. */
  name: string;
  /** Approximate total parameter count in billions. */
  params: number;
  /** Architecture family / category. */
  type: string;
}

export const CEREBRAS_MODELS: readonly CerebrasModel[] = [
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    params: 70,
    type: "llama",
  },
  {
    id: "llama-3.1-8b",
    name: "Llama 3.1 8B",
    params: 8,
    type: "llama",
  },
  {
    id: "llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B 16E Instruct",
    params: 17,
    type: "llama-moe",
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B",
    params: 32,
    type: "qwen",
  },
] as const satisfies readonly CerebrasModel[];

/** Set of model IDs for quick membership checks. */
export const CEREBRAS_MODEL_IDS = new Set(
  CEREBRAS_MODELS.map((m) => m.id),
);
