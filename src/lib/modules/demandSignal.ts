// ---------------------------------------------------------------------------
// Demand Signal Analysis Module
// ---------------------------------------------------------------------------
// Quantifies community demand for a model by combining download counts,
// likes, lab reputation, licence friendliness, and recency.
// ---------------------------------------------------------------------------

import type { ModelInfo, DemandSignalResult } from "@/lib/types/model";

// ---- lab tier mapping -----------------------------------------------------

/** Tier → score range midpoints. */
const LAB_TIERS: Record<number, { min: number; max: number }> = {
  1: { min: 90, max: 100 },
  2: { min: 70, max: 85 },
  3: { min: 50, max: 70 },
  4: { min: 30, max: 50 },
};

const TIER_1_LABS = new Set([
  "meta-llama",
  "google",
  "Qwen",
  "mistralai",
  "deepseek-ai",
]);

const TIER_2_LABS = new Set([
  "THUDM",
  "MiniMaxAI",
  "microsoft",
  "nvidia",
]);

const TIER_3_LABS = new Set([
  "01-ai",
  "internlm",
  "NousResearch",
]);

function getLabTier(author: string | undefined): number {
  if (!author) return 4;
  if (TIER_1_LABS.has(author)) return 1;
  if (TIER_2_LABS.has(author)) return 2;
  if (TIER_3_LABS.has(author)) return 3;
  return 4;
}

function labTierScore(tier: number): number {
  const range = LAB_TIERS[tier] ?? LAB_TIERS[4];
  // Use the midpoint of the tier's score range
  return Math.round((range.min + range.max) / 2);
}

// ---- license scoring ------------------------------------------------------

const LICENSE_SCORES: Record<string, number> = {
  "apache-2.0": 100,
  mit: 95,
  "llama-community": 75,
  "llama3": 75,
  "llama3.1": 75,
  "llama3.2": 75,
  "llama3.3": 75,
  "llama4": 75,
  custom: 60,
  "non-commercial": 30,
};

function scoreLicense(tags: string[]): { license: string; score: number } {
  // HuggingFace models carry licence info in their tags
  const licenseTag = tags.find(
    (t) =>
      t.startsWith("license:") || Object.keys(LICENSE_SCORES).includes(t.toLowerCase()),
  );

  if (!licenseTag) return { license: "unknown", score: 40 };

  const raw = licenseTag.replace(/^license:/, "").trim().toLowerCase();

  // Direct match
  if (LICENSE_SCORES[raw] !== undefined) {
    return { license: raw, score: LICENSE_SCORES[raw] };
  }

  // Partial / fuzzy
  if (raw.includes("apache")) return { license: raw, score: 100 };
  if (raw.includes("mit")) return { license: raw, score: 95 };
  if (raw.includes("llama")) return { license: raw, score: 75 };
  if (raw.includes("non-commercial") || raw.includes("cc-by-nc"))
    return { license: raw, score: 30 };

  return { license: raw, score: 60 }; // fallback to "custom"
}

// ---- download score (log‑scaled) ------------------------------------------

function downloadScore(downloads: number): number {
  if (downloads <= 0) return 0;
  // log10(1_000_000) = 6 → score 100
  const score = (Math.log10(downloads) / 6) * 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---- likes score (log‑scaled) ---------------------------------------------

function likesScore(likes: number): number {
  if (likes <= 0) return 0;
  // log10(10_000) = 4 → score 100
  const score = (Math.log10(likes) / 4) * 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---- recency score --------------------------------------------------------

function recencyScore(createdAt: string): { days: number; score: number } {
  const created = new Date(createdAt);
  const now = new Date();
  const days = Math.max(
    0,
    Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Very recent models score higher
  let score: number;
  if (days <= 7) score = 100;
  else if (days <= 30) score = 90;
  else if (days <= 90) score = 75;
  else if (days <= 180) score = 60;
  else if (days <= 365) score = 40;
  else score = 20;

  return { days, score };
}

// ---- composite demand calculation -----------------------------------------

interface DemandComponents {
  downloadScoreVal: number;
  labTierScoreVal: number;
  likesScoreVal: number;
  licenseScoreVal: number;
  recencyScoreVal: number;
}

function computeDemand(c: DemandComponents): number {
  // 30% downloads + 25% lab tier + 20% likes + 15% license + 10% recency
  const weighted =
    c.downloadScoreVal * 0.3 +
    c.labTierScoreVal * 0.25 +
    c.likesScoreVal * 0.2 +
    c.licenseScoreVal * 0.15 +
    c.recencyScoreVal * 0.1;
  return Math.round(Math.min(100, Math.max(0, weighted)));
}

// ---- trend heuristic ------------------------------------------------------

function downloadTrend(
  total: number,
  last30d: number,
): DemandSignalResult["downloadsTrend"] {
  if (total <= 0) return "stable";
  // If last month accounts for > 20% of all‑time downloads, rising
  const ratio = last30d / total;
  if (ratio > 0.2) return "rising";
  if (ratio < 0.05) return "declining";
  return "stable";
}

// ---- main export ----------------------------------------------------------

/**
 * Quantify the community demand signal for a model using metadata from
 * the HuggingFace Hub.
 *
 * @param modelInfo - Parsed HuggingFace model metadata
 */
export async function runDemandSignal(
  modelInfo: ModelInfo,
): Promise<DemandSignalResult> {
  const downloadsTotal = modelInfo.downloads ?? 0;
  const downloads30d = modelInfo.downloadsLastMonth ?? modelInfo.downloads ?? 0;
  const likes = modelInfo.likes ?? 0;

  const labName = modelInfo.author ?? "unknown";
  const labTier = getLabTier(modelInfo.author);
  const labTierScoreVal = labTierScore(labTier);

  const { license, score: licenseScoreVal } = scoreLicense(modelInfo.tags ?? []);

  const downloadScoreVal = downloadScore(downloadsTotal);
  const likesScoreVal = likesScore(likes);
  const { days: recencyDays, score: recencyScoreVal } = recencyScore(
    modelInfo.createdAt,
  );

  const overallScore = computeDemand({
    downloadScoreVal,
    labTierScoreVal,
    likesScoreVal,
    licenseScoreVal,
    recencyScoreVal,
  });

  const trend = downloadTrend(downloadsTotal, downloads30d);

  // Map to existing DemandSignalResult interface
  return {
    score: overallScore,
    downloadsLastMonth: downloads30d,
    downloadsTrend: trend,
    communityInterest: likesScoreVal,
    enterpriseInquiries: 0, // Not available from HF metadata alone
    socialMentions: 0, // Would require external API integration
    searchVolume: 0, // Would require external API integration
    topRequestingSegments: deriveSegments(modelInfo, labTier, licenseScoreVal),
  };
}

// ---- segment derivation ---------------------------------------------------

function deriveSegments(
  info: ModelInfo,
  labTier: number,
  licenseScore: number,
): string[] {
  const segments: string[] = [];
  const tags = (info.tags ?? []).map((t) => t.toLowerCase());

  if (tags.some((t) => t.includes("code") || t.includes("coder"))) {
    segments.push("Developer tools & IDE integrations");
  }
  if (tags.some((t) => t.includes("chat") || t.includes("instruct"))) {
    segments.push("Conversational AI / chatbot builders");
  }
  if (tags.some((t) => t.includes("vision") || t.includes("image"))) {
    segments.push("Multimodal & vision applications");
  }
  if (licenseScore >= 90) {
    segments.push("Enterprise / commercial deployments");
  }
  if (labTier <= 2) {
    segments.push("Frontier model evaluators");
  }
  if ((info.downloads ?? 0) > 100_000) {
    segments.push("High‑volume API consumers");
  }

  if (segments.length === 0) {
    segments.push("General‑purpose inference users");
  }

  return segments;
}
