// ---------------------------------------------------------------------------
// Competitive Gap Analysis Module
// ---------------------------------------------------------------------------
// Determines how many inference providers already serve a model and whether
// Cerebras has a first‑mover or speed advantage.
// ---------------------------------------------------------------------------

import type { CompetitiveGapResult } from "@/lib/types/model";
import {
  CEREBRAS_MODELS,
  CEREBRAS_MODEL_IDS,
} from "@/lib/constants/cerebrasModels";

// ---- provider catalogs ----------------------------------------------------

/** Hardcoded model catalogs for major inference providers (updated April 2026). */
const PROVIDER_CATALOGS: Record<string, readonly string[]> = {
  groq: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout",
    "gemma2-9b-it", "gemma-3-27b", "gemma-3-12b", "gemma-3-4b",
    "mixtral-8x7b", "qwen-3-32b", "deepseek-r1-distill",
  ],
  together: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout", "llama-4-maverick",
    "gemma-3-27b", "gemma-3-12b", "gemma-2-27b",
    "qwen-2.5-72b", "qwen-3-32b", "qwen-3-30b",
    "mixtral-8x7b", "deepseek-v3", "deepseek-r1", "mistral-small-24b",
  ],
  fireworks: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout",
    "gemma-3-27b", "gemma-2-27b",
    "qwen-2.5-72b", "qwen-3-32b", "mixtral-8x7b", "deepseek-v3",
    "mistral-small-24b",
  ],
  sambanova: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout",
    "gemma-3-27b", "deepseek-v3", "deepseek-r1", "qwen-3-32b",
  ],
  deepinfra: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout",
    "gemma-3-27b", "gemma-2-27b",
    "qwen-2.5-72b", "qwen-3-32b", "mixtral-8x7b", "mistral-small-24b",
  ],
  "google-ai": [
    "gemma-3-27b", "gemma-3-12b", "gemma-3-4b", "gemma-3-1b",
    "gemma-2-27b", "gemma-2-9b",
  ],
  openrouter: [
    "llama-3.3-70b", "llama-3.1-8b", "llama-4-scout", "llama-4-maverick",
    "gemma-3-27b", "gemma-3-12b", "gemma-2-27b",
    "qwen-2.5-72b", "qwen-3-32b", "qwen-3-30b",
    "deepseek-v3", "deepseek-r1", "mistral-small-24b", "mixtral-8x7b",
  ],
} as const;

// ---- helpers --------------------------------------------------------------

/**
 * Normalise a model name for fuzzy matching.
 * Strips punctuation, collapses whitespace, and lowercases.
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Fuzzy match: returns `true` when the normalised model name contains
 * the normalised catalog entry *or* vice‑versa.
 */
function fuzzyMatch(modelName: string, catalogEntry: string): boolean {
  const a = normalise(modelName);
  const b = normalise(catalogEntry);
  return a.includes(b) || b.includes(a);
}

/** Check whether the model (by name or author) matches any Cerebras entry. */
function isOnCerebras(modelName: string, modelAuthor: string): boolean {
  // Direct ID match
  if (CEREBRAS_MODEL_IDS.has(normalise(modelName))) return true;

  // Fuzzy match against all known Cerebras models
  return CEREBRAS_MODELS.some(
    (cm) =>
      fuzzyMatch(modelName, cm.id) ||
      fuzzyMatch(modelName, cm.name),
  );
}

interface ProviderMatch {
  name: string;
  serves_model: boolean;
  estimated_speed: string;
  estimated_price: string;
}

/** Estimated speed tiers and pricing for each provider (rough heuristics). */
const PROVIDER_META: Record<string, { speed: string; price: string }> = {
  groq: { speed: "~500 tok/s", price: "$0.05–0.90/M" },
  together: { speed: "~100 tok/s", price: "$0.10–0.90/M" },
  fireworks: { speed: "~200 tok/s", price: "$0.10–0.90/M" },
  sambanova: { speed: "~400 tok/s", price: "$0.10–1.00/M" },
  deepinfra: { speed: "~150 tok/s", price: "$0.05–0.80/M" },
  "google-ai": { speed: "~200 tok/s", price: "$0.10–0.50/M" },
  openrouter: { speed: "~150 tok/s", price: "$0.05–1.00/M" },
};

function matchProviders(modelName: string): ProviderMatch[] {
  const results: ProviderMatch[] = [];

  for (const [provider, catalog] of Object.entries(PROVIDER_CATALOGS)) {
    const serves = catalog.some((entry) => fuzzyMatch(modelName, entry));
    const meta = PROVIDER_META[provider] ?? {
      speed: "unknown",
      price: "unknown",
    };
    results.push({
      name: provider,
      serves_model: serves,
      estimated_speed: meta.speed,
      estimated_price: meta.price,
    });
  }

  return results;
}

// ---- scoring --------------------------------------------------------------

function computeScore(onCerebras: boolean, providerCount: number): number {
  if (onCerebras) return 10;
  if (providerCount === 0) return 95;
  if (providerCount <= 2) return 75;
  if (providerCount <= 5) return 55;
  return 35;
}

function marketGapSize(
  onCerebras: boolean,
  providerCount: number,
): CompetitiveGapResult["marketGapSize"] {
  if (onCerebras) return "none";
  if (providerCount === 0) return "large";
  if (providerCount <= 2) return "medium";
  return "small";
}

function riskOfNotOffering(
  providerCount: number,
): CompetitiveGapResult["riskOfNotOffering"] {
  if (providerCount >= 3) return "high";
  if (providerCount >= 1) return "medium";
  return "low";
}

function timelinePressure(
  providerCount: number,
): CompetitiveGapResult["timelinePressure"] {
  if (providerCount >= 4) return "urgent";
  if (providerCount >= 2) return "moderate";
  return "low";
}

// ---- main export ----------------------------------------------------------

/**
 * Analyse the competitive landscape for a model across major inference
 * providers and determine the opportunity / urgency for Cerebras.
 *
 * @param modelName    - Model identifier (e.g. "llama-3.3-70b")
 * @param modelAuthor  - HuggingFace author / org (e.g. "meta-llama")
 * @param estimatedTps - Estimated tokens‑per‑second on Cerebras hardware
 */
export async function runCompetitiveGap(
  modelName: string,
  modelAuthor: string,
  estimatedTps: number,
): Promise<CompetitiveGapResult> {
  const onCerebras = isOnCerebras(modelName, modelAuthor);
  const providers = matchProviders(modelName);
  const servingProviders = providers.filter((p) => p.serves_model);
  const providerCount = servingProviders.length;
  const firstMover = !onCerebras && providerCount === 0;

  // Speed advantage vs a "typical GPU endpoint" baseline of 150 tok/s
  const speedAdvantageMultiplier = estimatedTps / 150;

  const score = computeScore(onCerebras, providerCount);

  // Build differentiators
  const differentiators: string[] = [];
  if (speedAdvantageMultiplier > 2) {
    differentiators.push(
      `${speedAdvantageMultiplier.toFixed(1)}× speed advantage over GPU baselines`,
    );
  }
  if (firstMover) {
    differentiators.push("First‑mover opportunity — no provider serves this model yet");
  }
  if (!onCerebras && providerCount > 0) {
    differentiators.push(
      `Competitors (${servingProviders.map((p) => p.name).join(", ")}) already serve this model`,
    );
  }
  if (onCerebras) {
    differentiators.push("Already available on Cerebras inference cloud");
  }

  // Build competitors list
  const competitorsOffering = servingProviders.map((p) => p.name);

  return {
    score,
    competitorsOffering,
    uniqueAdvantage: firstMover || speedAdvantageMultiplier > 2,
    marketGapSize: marketGapSize(onCerebras, providerCount),
    differentiators,
    riskOfNotOffering: riskOfNotOffering(providerCount),
    timelinePressure: timelinePressure(providerCount),
  };
}
