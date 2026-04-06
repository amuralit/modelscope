// Server-side proxy for all HuggingFace API calls.
// Keys are read from process.env — never exposed to the client.

import { NextRequest, NextResponse } from "next/server";

const HF_BASE = "https://huggingface.co";
const HF_API = `${HF_BASE}/api`;

function getToken(): string {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN environment variable is not set");
  return token;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handleHFError(res: Response, modelId?: string | null): Promise<NextResponse> {
  if (res.status === 403) {
    const body = await res.text().catch(() => "");
    if (body.includes("restricted") || body.includes("gated")) {
      return NextResponse.json(
        { error: `This is a gated model. Visit https://huggingface.co/${modelId ?? ""} and accept the license agreement first, then retry.` },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: `Access denied (403). The model may be private or require license acceptance at https://huggingface.co/${modelId ?? ""}` },
      { status: 403 },
    );
  }
  if (res.status === 404) {
    return NextResponse.json(
      { error: `Model not found (404). Check that "${modelId}" exists on HuggingFace.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ error: `HuggingFace API error: ${res.status} ${res.statusText}` }, { status: res.status });
}

/**
 * Flatten nested configs (e.g. Gemma 3 puts arch fields inside `text_config`).
 * Also normalize field name variants (num_experts vs num_local_experts).
 */
function normalizeConfig(raw: Record<string, any>): Record<string, any> {
  // Start with the raw config
  const config = { ...raw };

  // If key arch fields are missing at top level but exist in text_config, merge them up
  const nested = raw.text_config ?? raw.language_config ?? raw.llm_config;
  if (nested && typeof nested === "object") {
    const fields = [
      "num_hidden_layers", "num_attention_heads", "num_key_value_heads",
      "hidden_size", "intermediate_size", "moe_intermediate_size", "vocab_size", "max_position_embeddings",
      "num_local_experts", "num_experts_per_tok", "num_experts", "n_routed_experts",
      "head_dim", "rope_theta", "sliding_window", "tie_word_embeddings",
      "first_k_dense_replace", "n_shared_experts", "hybrid_override_pattern",
      "expand", "ssm_state_size", "mamba_num_heads", "mamba_head_dim", "conv_kernel", "n_groups",
    ];
    for (const f of fields) {
      if (config[f] === undefined && nested[f] !== undefined) {
        config[f] = nested[f];
      }
    }
    // Inherit model_type if top-level is a multimodal wrapper
    if (!config.model_type_text) {
      config.model_type_text = nested.model_type;
    }
  }

  // Normalize expert count field variants → num_local_experts
  if (config.num_local_experts === undefined) {
    config.num_local_experts = config.num_experts ?? config.n_routed_experts;
  }

  // Some configs use head_dim but not hidden_size/num_attention_heads correctly
  // Ensure vocab_size exists (some multimodal models only have it nested)
  if (!config.vocab_size && nested?.vocab_size) {
    config.vocab_size = nested.vocab_size;
  }

  return config;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");
  const modelId = searchParams.get("modelId");

  try {
    switch (action) {
      case "config": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(`${HF_BASE}/${modelId}/raw/main/config.json`, {
          headers: authHeaders(),
        });
        if (!res.ok) return handleHFError(res, modelId);
        const raw = await res.json();
        const data = normalizeConfig(raw);
        return NextResponse.json(data);
      }

      case "info": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(`${HF_API}/models/${modelId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return handleHFError(res, modelId);
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "tokenizer": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(
          `${HF_BASE}/${modelId}/raw/main/tokenizer_config.json`,
          { headers: authHeaders() },
        );
        if (!res.ok) return handleHFError(res, modelId);
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "model_card": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(`${HF_BASE}/${modelId}/raw/main/README.md`, {
          headers: authHeaders(),
        });
        if (!res.ok) return handleHFError(res, modelId);
        const text = await res.text();
        return NextResponse.json({ content: text });
      }

      case "trending": {
        const params = new URLSearchParams({
          sort: "trendingScore",
          direction: "-1",
          pipeline_tag: "text-generation",
          limit: "50",
        });
        const res = await fetch(`${HF_API}/models?${params.toString()}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return handleHFError(res);
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "check_access": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        // Check model info for gated status
        const infoRes = await fetch(`${HF_API}/models/${modelId}`, {
          headers: authHeaders(),
        });
        if (!infoRes.ok) {
          return NextResponse.json({ accessible: false, gated: false, error: `Model not found (${infoRes.status})` });
        }
        const info = await infoRes.json();
        const gated = info.gated === "manual" || info.gated === "auto" || info.gated === true;

        if (!gated) {
          return NextResponse.json({ accessible: true, gated: false });
        }

        // Model is gated — try to fetch config to see if we already have access
        const configRes = await fetch(`${HF_BASE}/${modelId}/raw/main/config.json`, {
          headers: authHeaders(),
        });
        return NextResponse.json({
          accessible: configRes.ok,
          gated: true,
          modelUrl: `https://huggingface.co/${modelId}`,
        });
      }

      case "test": {
        const res = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: authHeaders(),
        });
        return NextResponse.json({ ok: res.ok });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
