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
