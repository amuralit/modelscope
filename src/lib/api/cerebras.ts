// ---------------------------------------------------------------------------
// Cerebras Inference API client – calls server-side proxy routes
// Keys never leave the server.
// ---------------------------------------------------------------------------

/**
 * Send a prompt to Cerebras via server-side proxy and return the response text.
 */
export async function generateReport(prompt: string): Promise<string> {
  const res = await fetch("/api/cerebras?action=generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Cerebras API request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.content;
}

/**
 * Run a live inference test on Cerebras and return real timing data.
 */
export interface LiveInferenceResult {
  content: string;
  model: string;
  timing: {
    queue_time_ms: number;
    prompt_time_ms: number;
    completion_time_ms: number;
    total_api_time_ms: number;
    wall_time_ms: number;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tokens_per_second: number;
}

export async function runLiveInference(prompt?: string, modelId?: string): Promise<LiveInferenceResult> {
  const res = await fetch("/api/cerebras?action=live_inference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt ?? "What is the capital of France?", max_tokens: 50, model_id: modelId }),
  });
  if (!res.ok) throw new Error(`Live inference failed: ${res.status}`);
  return res.json();
}

/**
 * Verify the server-side Cerebras API key is valid.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch("/api/cerebras?action=test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
