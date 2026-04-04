// Server-side proxy for Cerebras Inference API calls.
// Keys are read from process.env — never exposed to the client.

import { NextRequest, NextResponse } from "next/server";

const CEREBRAS_API = "https://api.cerebras.ai/v1";
const MODEL = "qwen-3-32b";

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
            model: MODEL,
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

      case "test": {
        const res = await fetch(`${CEREBRAS_API}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getKey()}`,
          },
          body: JSON.stringify({
            model: MODEL,
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
