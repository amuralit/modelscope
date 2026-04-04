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
        if (!res.ok) return NextResponse.json({ error: `HF ${res.status}` }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "info": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(`${HF_API}/models/${modelId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return NextResponse.json({ error: `HF ${res.status}` }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "tokenizer": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(
          `${HF_BASE}/${modelId}/raw/main/tokenizer_config.json`,
          { headers: authHeaders() },
        );
        if (!res.ok) return NextResponse.json({ error: `HF ${res.status}` }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "model_card": {
        if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });
        const res = await fetch(`${HF_BASE}/${modelId}/raw/main/README.md`, {
          headers: authHeaders(),
        });
        if (!res.ok) return NextResponse.json({ error: `HF ${res.status}` }, { status: res.status });
        const text = await res.text();
        return NextResponse.json({ content: text });
      }

      case "trending": {
        const params = new URLSearchParams({
          sort: "trending",
          direction: "-1",
          filter: "text-generation",
          limit: "50",
        });
        const res = await fetch(`${HF_API}/models?${params.toString()}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return NextResponse.json({ error: `HF ${res.status}` }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
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
