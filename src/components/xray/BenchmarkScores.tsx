'use client';

import InfoTip from '@/components/shared/InfoTip';
import { useMemo } from 'react';

interface BenchmarkScoresProps {
  modelCard: string;
  modelType: string;
}

type Category = 'Knowledge & Reasoning' | 'Code' | 'Math' | 'Instruction';

interface BenchmarkEntry {
  name: string;
  category: Category;
  score: number;
  normalized: number; // 0-100
}

// Benchmark definitions with keywords to search for in table rows
const BENCHMARKS: { name: string; keywords: string[]; category: Category; scale: number }[] = [
  { name: 'MMLU', keywords: ['mmlu'], category: 'Knowledge & Reasoning', scale: 100 },
  { name: 'GPQA', keywords: ['gpqa'], category: 'Knowledge & Reasoning', scale: 100 },
  { name: 'ARC-Challenge', keywords: ['arc-c', 'arc_c', 'arc-challenge'], category: 'Knowledge & Reasoning', scale: 100 },
  { name: 'BBH', keywords: ['bbh', 'big-bench hard', 'big bench hard'], category: 'Knowledge & Reasoning', scale: 100 },
  { name: 'HumanEval', keywords: ['humaneval'], category: 'Code', scale: 100 },
  { name: 'LiveCodeBench', keywords: ['livecodebench', 'live code bench'], category: 'Code', scale: 100 },
  { name: 'SWE-Bench', keywords: ['swe-bench', 'swe_bench'], category: 'Code', scale: 100 },
  { name: 'MATH', keywords: ['math'], category: 'Math', scale: 100 },
  { name: 'GSM8K', keywords: ['gsm8k', 'gsm-8k'], category: 'Math', scale: 100 },
  { name: 'IFEval', keywords: ['ifeval', 'if-eval'], category: 'Instruction', scale: 100 },
  { name: 'MT-Bench', keywords: ['mt-bench', 'mt bench', 'mtbench'], category: 'Instruction', scale: 10 },
];

/**
 * Extract benchmark scores from a model card.
 * Strategy: find markdown table rows containing benchmark names,
 * then take the LAST numeric value in the row (= largest model size).
 */
function extractBenchmarks(modelCard: string): BenchmarkEntry[] {
  const lines = modelCard.split('\n');
  const results: BenchmarkEntry[] = [];
  const seen = new Set<string>();

  for (const bench of BENCHMARKS) {
    if (seen.has(bench.name)) continue;

    // Skip base MMLU if we already found MMLU-Pro
    if (bench.name === 'MMLU' && seen.has('MMLU-Pro')) continue;

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Check if this line mentions the benchmark
      const matchesKeyword = bench.keywords.some(kw => lower.includes(kw));
      if (!matchesKeyword) continue;

      // Skip lines that are just references/links (e.g., "[mmlu]: https://...")
      if (line.trim().startsWith('[') && line.includes('http')) continue;
      // Skip lines that are just descriptions
      if (!line.includes('|') && !line.match(/\d{2,}/)) continue;

      // For "MMLU" keyword, skip lines that say "MMLU-Pro" or "MMLU (Pro"
      if (bench.name === 'MMLU' && (lower.includes('mmlu-pro') || lower.includes('mmlu (pro') || lower.includes('mmlu pro'))) continue;

      // Extract ALL numbers from the line
      const numbers: number[] = [];
      const numRegex = /\b(\d{1,3}(?:\.\d+)?)\b/g;
      let m;
      while ((m = numRegex.exec(line)) !== null) {
        const val = parseFloat(m[1]);
        // Filter out shot counts (typically "5-shot", "0-shot", "25-shot")
        // by checking if the number is immediately followed by "-shot"
        const afterNum = line.substring(m.index + m[0].length, m.index + m[0].length + 6);
        if (afterNum.toLowerCase().startsWith('-shot') || afterNum.toLowerCase().startsWith(' shot')) continue;
        // Filter out numbers that are clearly not scores
        if (bench.scale === 100 && val > 100) continue;
        if (bench.scale === 10 && val > 10) continue;
        if (val < 0) continue;
        numbers.push(val);
      }

      if (numbers.length === 0) continue;

      // Take the LAST number (= largest model / rightmost column in comparison tables)
      const score = numbers[numbers.length - 1];

      // Sanity: score should be reasonable
      if (bench.scale === 100 && score < 1) continue;

      const normalized = bench.scale === 10 ? (score / 10) * 100 : score;

      results.push({
        name: bench.name,
        category: bench.category,
        score,
        normalized: Math.min(100, normalized),
      });
      seen.add(bench.name);
      break; // found this benchmark, move to next
    }
  }

  return results;
}

function scoreColor(n: number): string {
  if (n >= 70) return '#059669';
  if (n >= 40) return '#D97706';
  return '#DC2626';
}

function scoreBg(n: number): string {
  if (n >= 70) return 'bg-emerald-500';
  if (n >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function qualityBadge(avg: number): { label: string; cls: string } {
  if (avg >= 80) return { label: 'Frontier', cls: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' };
  if (avg >= 60) return { label: 'Strong', cls: 'bg-[#6366F1]/10 text-[#6366F1] ring-[#6366F1]/20' };
  if (avg >= 40) return { label: 'Moderate', cls: 'bg-amber-500/10 text-amber-600 ring-amber-500/20' };
  return { label: 'Limited', cls: 'bg-red-500/10 text-red-600 ring-red-500/20' };
}

const CAT_ORDER: Category[] = ['Knowledge & Reasoning', 'Code', 'Math', 'Instruction'];

export default function BenchmarkScores({ modelCard, modelType }: BenchmarkScoresProps) {
  const benchmarks = useMemo(() => extractBenchmarks(modelCard), [modelCard]);

  const avgScore = useMemo(() => {
    if (benchmarks.length === 0) return 0;
    return benchmarks.reduce((s, b) => s + b.normalized, 0) / benchmarks.length;
  }, [benchmarks]);

  const badge = qualityBadge(avgScore);

  const grouped = useMemo(() => {
    const map: Partial<Record<Category, BenchmarkEntry[]>> = {};
    for (const b of benchmarks) {
      if (!map[b.category]) map[b.category] = [];
      map[b.category]!.push(b);
    }
    return map;
  }, [benchmarks]);

  if (benchmarks.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#0F172A]">Benchmark Scores <InfoTip text="Benchmark scores automatically extracted from the model card. Scores shown are from the largest model variant." /></h3>
        <div className="mt-6 flex flex-col items-center py-8 text-center">
          <p className="text-sm text-[#94A3B8]">No benchmark scores found in the model card.</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Check the model&apos;s HuggingFace page for evaluation results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Benchmark Scores <InfoTip text="Benchmark scores automatically extracted from the model card. Scores shown are from the largest model variant." /></h3>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="font-mono text-lg font-bold" style={{ color: scoreColor(avgScore) }}>
            {avgScore.toFixed(1)}
          </span>
          <span className="text-xs text-[#94A3B8]">avg</span>
        </div>
      </div>

      {/* Benchmarks by category */}
      <div className="space-y-5">
        {CAT_ORDER.map((cat) => {
          const entries = grouped[cat];
          if (!entries || entries.length === 0) return null;
          return (
            <div key={cat}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6366F1]">
                {cat}
              </p>
              <div className="space-y-2">
                {entries.map((b) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-[#0F172A]">{b.name}</span>
                    <div className="flex-1 h-5 rounded-full bg-[#F1F5F9] overflow-hidden relative">
                      {/* Threshold markers */}
                      <div className="absolute left-[40%] top-0 h-full w-px bg-[#E2E8F0]" />
                      <div className="absolute left-[70%] top-0 h-full w-px bg-[#E2E8F0]" />
                      {/* Fill bar */}
                      <div
                        className={`h-full rounded-full ${scoreBg(b.normalized)} transition-all duration-500`}
                        style={{ width: `${Math.max(2, b.normalized)}%`, opacity: 0.8 }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs font-semibold" style={{ color: scoreColor(b.normalized) }}>
                      {b.score}
                      <span className="text-[#94A3B8] font-normal"> / {b.category === 'Instruction' && b.name === 'MT-Bench' ? '10' : '100'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[10px] text-[#94A3B8]">
        <span>Benchmarks found: <strong className="text-[#475569]">{benchmarks.length}</strong></span>
        <span className="text-[#E2E8F0]">|</span>
        <span>Scores from the <strong className="text-[#475569]">largest model variant</strong> in the card (rightmost column)</span>
        <span className="text-[#E2E8F0]">|</span>
        <span>Model: <strong className="text-[#475569]">{modelType}</strong></span>
      </div>
    </div>
  );
}
