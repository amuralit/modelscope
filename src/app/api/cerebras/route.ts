// Server-side proxy for Cerebras Inference API calls.
// Keys are read from process.env — never exposed to the client.

import { NextRequest, NextResponse } from "next/server";

const CEREBRAS_API = "https://api.cerebras.ai/v1";
const DEFAULT_MODEL = "llama3.1-8b";

/** Available Cerebras models — try to match the evaluated model */
const CEREBRAS_MODELS = ["llama3.1-8b", "qwen-3-235b-a22b-instruct-2507", "gpt-oss-120b", "zai-glm-4.7"];

function matchCerebrasModel(modelId: string): string {
  const lower = modelId.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Try exact-ish matches
  for (const cm of CEREBRAS_MODELS) {
    const cmLower = cm.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.includes(cmLower) || cmLower.includes(lower)) return cm;
  }
  // Try family matches
  if (lower.includes('llama')) return 'llama3.1-8b';
  if (lower.includes('qwen')) return 'qwen-3-235b-a22b-instruct-2507';
  if (lower.includes('glm')) return 'zai-glm-4.7';
  return DEFAULT_MODEL;
}

function getKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("CEREBRAS_API_KEY environment variable is not set");
  return key;
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "generate": {
        const body = await req.json();
        const prompt = body.prompt;
        if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

        const res = await fetch(`${CEREBRAS_API}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getKey()}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!res.ok) {
          return NextResponse.json(
            { error: `Cerebras API ${res.status}` },
            { status: res.status },
          );
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        return NextResponse.json({ content: content ?? "" });
      }

      case "live_inference": {
        const body = await req.json();
        const prompt = body.prompt ?? "What is the capital of France?";
        const maxTokens = body.max_tokens ?? 50;
        const requestedModel = body.model_id ?? "";
        const model = matchCerebrasModel(requestedModel);

        const startTime = Date.now();
        const res = await fetch(`${CEREBRAS_API}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getKey()}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
          }),
        });
        const wallTime = Date.now() - startTime;

        if (!res.ok) {
          return NextResponse.json({ error: `Cerebras API ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? "";
        const usage = data.usage ?? {};
        const timeInfo = data.time_info ?? {};

        return NextResponse.json({
          content,
          model: data.model ?? MODEL,
          timing: {
            queue_time_ms: (timeInfo.queue_time ?? 0) * 1000,
            prompt_time_ms: (timeInfo.prompt_time ?? 0) * 1000,
            completion_time_ms: (timeInfo.completion_time ?? 0) * 1000,
            total_api_time_ms: (timeInfo.total_time ?? 0) * 1000,
            wall_time_ms: wallTime,
          },
          usage: {
            prompt_tokens: usage.prompt_tokens ?? 0,
            completion_tokens: usage.completion_tokens ?? 0,
            total_tokens: usage.total_tokens ?? 0,
          },
          tokens_per_second: usage.completion_tokens && timeInfo.completion_time
            ? Math.round(usage.completion_tokens / timeInfo.completion_time)
            : 0,
        });
      }

      case "test": {
        const res = await fetch(`${CEREBRAS_API}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getKey()}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [{ role: "user", content: "Hi" }],
          }),
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
