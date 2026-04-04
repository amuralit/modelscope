'use client';

import { useMemo } from 'react';

interface BenchmarkScoresProps {
  modelCard: string;
  modelType: string;
}

type BenchmarkCategory =
  | 'Knowledge & Reasoning'
  | 'Code'
  | 'Math'
  | 'Instruction'
  | 'Competitive';

interface BenchmarkEntry {
  name: string;
  category: BenchmarkCategory;
  score: number;
  maxScale: number;
  normalizedScore: number;
}

interface BenchmarkDef {
  name: string;
  category: BenchmarkCategory;
  patterns: RegExp[];
  maxScale: number;
}

const BENCHMARK_DEFS: BenchmarkDef[] = [
  {
    name: 'MMLU-Pro',
    category: 'Knowledge & Reasoning',
    patterns: [
      /MMLU[- ]?Pro[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*MMLU[- ]?Pro\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'MMLU',
    category: 'Knowledge & Reasoning',
    patterns: [
      /(?<!Pro[^0-9]{0,5})\bMMLU\b(?![- ]?Pro)[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*MMLU\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'GPQA',
    category: 'Knowledge & Reasoning',
    patterns: [
      /GPQA[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*GPQA[^|]*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'ARC-Challenge',
    category: 'Knowledge & Reasoning',
    patterns: [
      /ARC[- ]?Challenge[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*ARC[- ]?Challenge\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
      /ARC[- ]?C[^a-z][^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
    ],
    maxScale: 100,
  },
  {
    name: 'BBH',
    category: 'Knowledge & Reasoning',
    patterns: [
      /\bBBH\b[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /Big[- ]?Bench[- ]?Hard[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*BBH\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'HumanEval+',
    category: 'Code',
    patterns: [
      /HumanEval\+[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /HumanEval[- ]?Plus[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*HumanEval\+\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'HumanEval',
    category: 'Code',
    patterns: [
      /\bHumanEval\b(?!\+)(?![- ]?Plus)[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*HumanEval\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'LiveCodeBench',
    category: 'Code',
    patterns: [
      /LiveCodeBench[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /Live[- ]?Code[- ]?Bench[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*LiveCodeBench\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'SWE-Bench',
    category: 'Code',
    patterns: [
      /SWE[- ]?Bench[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*SWE[- ]?Bench[^|]*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'MATH-500',
    category: 'Math',
    patterns: [
      /MATH[- ]?500[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*MATH[- ]?500\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'MATH',
    category: 'Math',
    patterns: [
      /\bMATH\b(?![- ]?500)[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*MATH\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'IFEval',
    category: 'Instruction',
    patterns: [
      /IFEval[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /IF[- ]?Eval[^0-9]*?(\d{1,3}(?:\.\d+)?)/i,
      /\|\s*IFEval\s*\|\s*(\d{1,3}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 100,
  },
  {
    name: 'MT-Bench',
    category: 'Instruction',
    patterns: [
      /MT[- ]?Bench[^0-9]*?(\d{1,2}(?:\.\d+)?)/i,
      /\|\s*MT[- ]?Bench\s*\|\s*(\d{1,2}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 10,
  },
  {
    name: 'Arena Elo',
    category: 'Competitive',
    patterns: [
      /Arena[- ]?Elo[^0-9]*?(\d{3,4}(?:\.\d+)?)/i,
      /\bElo[^0-9]*?(\d{3,4}(?:\.\d+)?)/i,
      /\|\s*Arena[- ]?Elo\s*\|\s*(\d{3,4}(?:\.\d+)?)\s*\|/i,
    ],
    maxScale: 1400,
  },
];

const CATEGORY_ORDER: BenchmarkCategory[] = [
  'Knowledge & Reasoning',
  'Code',
  'Math',
  'Instruction',
  'Competitive',
];

const CATEGORY_ICONS: Record<BenchmarkCategory, string> = {
  'Knowledge & Reasoning': 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  'Code': 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
  'Math': 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z',
  'Instruction': 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
  'Competitive': 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0',
};

function extractBenchmarks(modelCard: string): BenchmarkEntry[] {
  const found: BenchmarkEntry[] = [];
  const seenNames = new Set<string>();

  for (const def of BENCHMARK_DEFS) {
    if (seenNames.has(def.name)) continue;

    // For benchmarks with "Pro"/"Plus"/"500" variants, skip the base version
    // if we already found the variant
    const baseVariantMap: Record<string, string> = {
      'MMLU': 'MMLU-Pro',
      'HumanEval': 'HumanEval+',
      'MATH': 'MATH-500',
    };
    if (baseVariantMap[def.name] && seenNames.has(baseVariantMap[def.name])) {
      continue;
    }

    for (const pattern of def.patterns) {
      const match = modelCard.match(pattern);
      if (match && match[1]) {
        const rawScore = parseFloat(match[1]);

        // Sanity checks
        if (isNaN(rawScore)) continue;
        if (def.maxScale === 100 && rawScore > 100) continue;
        if (def.maxScale === 10 && rawScore > 10) continue;
        if (def.name === 'Arena Elo' && (rawScore < 500 || rawScore > 2000)) continue;

        let normalizedScore: number;
        if (def.name === 'Arena Elo') {
          // Normalize Elo: map 1000-1400 to 0-100
          normalizedScore = Math.max(0, Math.min(100, ((rawScore - 1000) / 400) * 100));
        } else if (def.maxScale === 10) {
          normalizedScore = (rawScore / 10) * 100;
        } else {
          normalizedScore = rawScore;
        }

        found.push({
          name: def.name,
          category: def.category,
          score: rawScore,
          maxScale: def.maxScale,
          normalizedScore: Math.round(normalizedScore * 10) / 10,
        });
        seenNames.add(def.name);
        break;
      }
    }
  }

  return found;
}

function getScoreColor(normalized: number): {
  bar: string;
  text: string;
  bg: string;
} {
  if (normalized >= 70) {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-500/10',
    };
  }
  if (normalized >= 40) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      bg: 'bg-amber-500/10',
    };
  }
  return {
    bar: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-500/10',
  };
}

function getQualityBadge(avgScore: number): {
  label: string;
  textClass: string;
  bgClass: string;
  ringClass: string;
} {
  if (avgScore >= 80) {
    return {
      label: 'Frontier',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-500/15',
      ringClass: 'ring-emerald-500/20',
    };
  }
  if (avgScore >= 60) {
    return {
      label: 'Strong',
      textClass: 'text-indigo-700',
      bgClass: 'bg-indigo-500/15',
      ringClass: 'ring-indigo-500/20',
    };
  }
  if (avgScore >= 40) {
    return {
      label: 'Moderate',
      textClass: 'text-amber-700',
      bgClass: 'bg-amber-500/15',
      ringClass: 'ring-amber-500/20',
    };
  }
  return {
    label: 'Limited',
    textClass: 'text-red-700',
    bgClass: 'bg-red-500/15',
    ringClass: 'ring-red-500/20',
  };
}

function formatScore(entry: BenchmarkEntry): string {
  if (entry.name === 'Arena Elo') {
    return entry.score.toFixed(0);
  }
  if (entry.maxScale === 10) {
    return entry.score.toFixed(1);
  }
  // Show one decimal only if the score has a fractional part
  return entry.score % 1 === 0
    ? entry.score.toFixed(0)
    : entry.score.toFixed(1);
}

function formatScaleLabel(entry: BenchmarkEntry): string {
  if (entry.name === 'Arena Elo') return 'Elo';
  if (entry.maxScale === 10) return '/ 10';
  return '/ 100';
}

export default function BenchmarkScores({
  modelCard,
  modelType,
}: BenchmarkScoresProps) {
  const benchmarks = useMemo(() => extractBenchmarks(modelCard), [modelCard]);

  const groupedBenchmarks = useMemo(() => {
    const groups: Partial<Record<BenchmarkCategory, BenchmarkEntry[]>> = {};
    for (const entry of benchmarks) {
      if (!groups[entry.category]) {
        groups[entry.category] = [];
      }
      groups[entry.category]!.push(entry);
    }
    return groups;
  }, [benchmarks]);

  const averageScore = useMemo(() => {
    if (benchmarks.length === 0) return 0;
    const sum = benchmarks.reduce((acc, b) => acc + b.normalizedScore, 0);
    return Math.round((sum / benchmarks.length) * 10) / 10;
  }, [benchmarks]);

  const badge = useMemo(() => getQualityBadge(averageScore), [averageScore]);

  const categoriesPresent = useMemo(
    () => CATEGORY_ORDER.filter((cat) => groupedBenchmarks[cat]),
    [groupedBenchmarks]
  );

  if (benchmarks.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">
            Benchmark Scores
          </h3>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <svg
            className="h-10 w-10 text-[#94A3B8]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
            />
          </svg>
          <p className="max-w-sm text-sm text-[#475569]">
            No benchmark scores found in the model card. Check the model&apos;s
            HuggingFace page for evaluation results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Benchmark Scores
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.textClass} ${badge.bgClass} ${badge.ringClass}`}
          >
            {badge.label === 'Frontier' && (
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {badge.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-semibold text-[#0F172A]">
              {averageScore}
            </span>
            <span className="text-xs text-[#94A3B8]">avg</span>
          </div>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-5">
        {categoriesPresent.map((category) => {
          const entries = groupedBenchmarks[category]!;
          const iconPath = CATEGORY_ICONS[category];

          return (
            <div key={category}>
              {/* Category header */}
              <div className="mb-2 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-[#6366F1]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={iconPath}
                  />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#6366F1]">
                  {category}
                </span>
              </div>

              {/* Benchmark rows */}
              <div className="space-y-1.5">
                {entries.map((entry) => {
                  const colors = getScoreColor(entry.normalizedScore);
                  const barWidth = Math.max(2, Math.min(100, entry.normalizedScore));

                  return (
                    <div
                      key={entry.name}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#F8FAFC]"
                    >
                      {/* Benchmark name */}
                      <div className="w-32 shrink-0">
                        <span className="text-sm font-medium text-[#0F172A]">
                          {entry.name}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colors.bar}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        {/* Threshold markers */}
                        <div className="absolute inset-y-0 left-[40%] w-px bg-[#E2E8F0]/60" />
                        <div className="absolute inset-y-0 left-[70%] w-px bg-[#E2E8F0]/60" />
                      </div>

                      {/* Score */}
                      <div className="flex w-20 shrink-0 items-center justify-end gap-1">
                        <span
                          className={`font-mono text-sm font-semibold ${colors.text}`}
                        >
                          {formatScore(entry)}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]">
                          {formatScaleLabel(entry)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary strip */}
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">Benchmarks found:</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {benchmarks.length}
          </span>
        </div>
        <div className="h-4 w-px bg-[#E2E8F0]" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">Categories:</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {categoriesPresent.length}
          </span>
        </div>
        <div className="h-4 w-px bg-[#E2E8F0]" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#475569]">Model type:</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {modelType}
          </span>
        </div>
        {benchmarks.some((b) => b.normalizedScore >= 80) && (
          <>
            <div className="h-4 w-px bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#475569]">Top score:</span>
              <span className="font-mono font-semibold text-emerald-700">
                {Math.max(...benchmarks.map((b) => b.normalizedScore)).toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
