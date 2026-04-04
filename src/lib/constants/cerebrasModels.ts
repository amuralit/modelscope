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
    id: "llama3.1-8b",
    name: "Llama 3.1 8B",
    params: 8,
    type: "llama",
  },
  {
    id: "gpt-oss-120b",
    name: "GPT OSS 120B",
    params: 120,
    type: "gpt",
  },
  {
    id: "qwen-3-235b-a22b-instruct-2507",
    name: "Qwen 3 235B A22B Instruct",
    params: 235,
    type: "qwen-moe",
  },
  {
    id: "zai-glm-4.7",
    name: "ZAI GLM 4.7",
    params: 9,
    type: "glm",
  },
] as const satisfies readonly CerebrasModel[];

/** Set of model IDs for quick membership checks. */
export const CEREBRAS_MODEL_IDS = new Set(
  CEREBRAS_MODELS.map((m) => m.id),
);
