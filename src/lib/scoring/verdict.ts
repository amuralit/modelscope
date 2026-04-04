// ---------------------------------------------------------------------------
// Verdict – human‑readable decision from a composite score
// ---------------------------------------------------------------------------

export interface VerdictResult {
  verdict: "GO" | "EVALUATE" | "SKIP";
  label: string;
  description: string;
}

/**
 * Map a numeric composite score (0‑100) to an actionable verdict.
 *
 * | Range  | Verdict    | Meaning                                        |
 * |--------|------------|------------------------------------------------|
 * | >= 80  | GO         | Strong fit — launch on Cerebras immediately     |
 * | >= 50  | EVALUATE   | Promising but needs PM / engineering judgment   |
 * | < 50   | SKIP       | Low Cerebras fit — deprioritise                 |
 *
 * @param score - Composite score between 0 and 100.
 */
export function getVerdict(score: number): VerdictResult {
  if (score >= 80) {
    return {
      verdict: "GO",
      label: "Launch immediately",
      description:
        "This model is an excellent fit for Cerebras inference. It scores highly across architecture compatibility, demand signals, and competitive positioning. Recommend prioritising onboarding.",
    };
  }

  if (score >= 50) {
    return {
      verdict: "EVALUATE",
      label: "Needs PM judgment",
      description:
        "This model shows moderate potential on Cerebras hardware but has gaps in one or more dimensions. A product manager should weigh strategic value, customer requests, and engineering effort before committing resources.",
    };
  }

  return {
    verdict: "SKIP",
    label: "Low Cerebras fit",
    description:
      "This model is unlikely to deliver strong value on the Cerebras inference platform at this time. Consider re‑evaluating if demand signals change or hardware support improves.",
  };
}
