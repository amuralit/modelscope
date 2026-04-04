// ---------------------------------------------------------------------------
// HuggingFace API client – client-side fetch helpers
// ---------------------------------------------------------------------------

import type { ModelConfig, ModelInfo } from "@/lib/types/model";

const HF_BASE = "https://huggingface.co";
const HF_API = `${HF_BASE}/api`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function fetchJSON<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(
      `HuggingFace request failed: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the raw `config.json` for a model (architecture / hyper-params).
 */
export async function fetchModelConfig(
  modelId: string,
  token: string,
): Promise<ModelConfig> {
  return fetchJSON<ModelConfig>(
    `${HF_BASE}/${modelId}/raw/main/config.json`,
    token,
  );
}

/**
 * Fetch model metadata from the HuggingFace Hub API.
 */
export async function fetchModelInfo(
  modelId: string,
  token: string,
): Promise<ModelInfo> {
  return fetchJSON<ModelInfo>(`${HF_API}/models/${modelId}`, token);
}

/**
 * Fetch the tokenizer configuration for a model.
 */
export async function fetchTokenizerConfig(
  modelId: string,
  token: string,
): Promise<any> {
  return fetchJSON<any>(
    `${HF_BASE}/${modelId}/raw/main/tokenizer_config.json`,
    token,
  );
}

/**
 * Fetch the model card (README.md) as plain text.
 */
export async function fetchModelCard(
  modelId: string,
  token: string,
): Promise<string> {
  const res = await fetch(`${HF_BASE}/${modelId}/raw/main/README.md`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch model card: ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
}

/**
 * Fetch the current list of trending text-generation models (up to 50).
 */
export async function fetchTrendingModels(
  token: string,
): Promise<ModelInfo[]> {
  const params = new URLSearchParams({
    sort: "trending",
    direction: "-1",
    filter: "text-generation",
    limit: "50",
  });
  return fetchJSON<ModelInfo[]>(`${HF_API}/models?${params.toString()}`, token);
}

/**
 * Verify that the provided HuggingFace token is valid by making a
 * lightweight API call to the /whoami-v2 endpoint.
 * Returns `true` on success, `false` otherwise.
 */
export async function testConnection(token: string): Promise<boolean> {
  try {
    const res = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: authHeaders(token),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Extract a `owner/model` id from a HuggingFace URL.
 *
 * Accepts URLs like:
 *   - https://huggingface.co/google/gemma-3-27b-it
 *   - https://huggingface.co/google/gemma-3-27b-it/tree/main
 *   - http://huggingface.co/meta-llama/Llama-3-8B
 *
 * Returns `null` if the URL doesn't match the expected format.
 */
export function parseModelIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "huggingface.co") return null;

    // pathname looks like "/google/gemma-3-27b-it" (possibly with trailing segments)
    const segments = parsed.pathname
      .split("/")
      .filter((s) => s.length > 0);

    if (segments.length < 2) return null;

    const owner = segments[0];
    const model = segments[1];

    // Basic sanity: both parts should be non-empty alphanumeric-ish strings
    const validPart = /^[a-zA-Z0-9._-]+$/;
    if (!validPart.test(owner) || !validPart.test(model)) return null;

    return `${owner}/${model}`;
  } catch {
    return null;
  }
}
