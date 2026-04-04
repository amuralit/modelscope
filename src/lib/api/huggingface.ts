// ---------------------------------------------------------------------------
// HuggingFace API client – calls server-side proxy routes
// Keys never leave the server.
// ---------------------------------------------------------------------------

import type { ModelConfig, ModelInfo } from "@/lib/types/model";

async function proxyGet<T>(action: string, modelId?: string): Promise<T> {
  const params = new URLSearchParams({ action });
  if (modelId) params.set("modelId", modelId);
  const res = await fetch(`/api/hf?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HuggingFace request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch the raw `config.json` for a model (architecture / hyper-params).
 */
export async function fetchModelConfig(modelId: string): Promise<ModelConfig> {
  return proxyGet<ModelConfig>("config", modelId);
}

/**
 * Fetch model metadata from the HuggingFace Hub API.
 */
export async function fetchModelInfo(modelId: string): Promise<ModelInfo> {
  return proxyGet<ModelInfo>("info", modelId);
}

/**
 * Fetch the tokenizer configuration for a model.
 */
export async function fetchTokenizerConfig(modelId: string): Promise<any> {
  return proxyGet<any>("tokenizer", modelId);
}

/**
 * Fetch the model card (README.md) as plain text.
 */
export async function fetchModelCard(modelId: string): Promise<string> {
  const data = await proxyGet<{ content: string }>("model_card", modelId);
  return data.content;
}

/**
 * Fetch the current list of trending text-generation models (up to 50).
 */
export async function fetchTrendingModels(): Promise<ModelInfo[]> {
  return proxyGet<ModelInfo[]>("trending");
}

/**
 * Verify the server-side HuggingFace token is valid.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const data = await proxyGet<{ ok: boolean }>("test");
    return data.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a model is gated and whether we have access.
 * Returns { accessible, gated, modelUrl? }
 */
export async function checkModelAccess(modelId: string): Promise<{
  accessible: boolean;
  gated: boolean;
  modelUrl?: string;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ action: "check_access", modelId });
    const res = await fetch(`/api/hf?${params.toString()}`);
    return res.json();
  } catch {
    return { accessible: false, gated: false, error: "Failed to check access" };
  }
}

/**
 * Extract a `owner/model` id from a HuggingFace URL.
 */
export function parseModelIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "huggingface.co") return null;
    const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
    if (segments.length < 2) return null;
    const owner = segments[0];
    const model = segments[1];
    const validPart = /^[a-zA-Z0-9._-]+$/;
    if (!validPart.test(owner) || !validPart.test(model)) return null;
    return `${owner}/${model}`;
  } catch {
    return null;
  }
}
