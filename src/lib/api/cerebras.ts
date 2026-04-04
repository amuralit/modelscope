// ---------------------------------------------------------------------------
// Cerebras Inference API client – client-side fetch helpers
// ---------------------------------------------------------------------------

const CEREBRAS_API = "https://api.cerebras.ai/v1";
const MODEL = "qwen-3-32b";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
}

async function chatCompletion(
  apiKey: string,
  messages: ChatMessage[],
): Promise<ChatCompletionResponse> {
  const res = await fetch(`${CEREBRAS_API}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Cerebras API request failed: ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<ChatCompletionResponse>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a prompt to the Cerebras inference API and return the assistant's
 * response text.  Uses the OpenAI-compatible chat completions endpoint.
 */
export async function generateReport(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const response = await chatCompletion(apiKey, [
    { role: "user", content: prompt },
  ]);

  const content = response.choices?.[0]?.message?.content;
  if (content === undefined || content === null) {
    throw new Error("Cerebras API returned an empty response");
  }

  return content;
}

/**
 * Verify that the provided API key is valid by making a lightweight
 * chat completion call. Returns `true` on success, `false` otherwise.
 */
export async function testConnection(apiKey: string): Promise<boolean> {
  try {
    await chatCompletion(apiKey, [
      { role: "user", content: "Hi" },
    ]);
    return true;
  } catch {
    return false;
  }
}
