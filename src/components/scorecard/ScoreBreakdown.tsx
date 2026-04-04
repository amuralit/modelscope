'use client';

interface BreakdownEntry {
  score: number;
  weight: number;
  weighted: number;
}

interface ScoreBreakdownProps {
  breakdown: Record<string, BreakdownEntry>;
}

const DIMENSION_LABELS: Record<string, string> = {
  architecture: 'Architecture',
  wseFit: 'WSE Fit',
  speedSensitivity: 'Speed Sensitivity',
  agenticFit: 'Agentic Fit',
  competitiveGap: 'Competitive Gap',
  demandSignal: 'Demand Signal',
  reapPotential: 'REAP Potential',
};

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreTextClass(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const entries = Object.entries(breakdown);

  return (
    <div className="rounded-[16px] border border-[#E2E8F0] bg-[#FFFFFF] p-6">
      <h3 className="mb-5 text-sm font-semibold tracking-wider text-[#475569] uppercase">
        Score Breakdown
      </h3>

      <div className="space-y-4">
        {entries.map(([key, entry]) => {
          const label = DIMENSION_LABELS[key] || key;
          const weightPercent = Math.round(entry.weight * 100);

          return (
            <div key={key}>
              {/* Header row: label, score, weight */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-[#0F172A]">
                  {label}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-sm font-semibold ${getScoreTextClass(entry.score)}`}
                  >
                    {entry.score}
                  </span>
                  <span className="min-w-[3.5rem] text-right text-xs text-[#94A3B8]">
                    {weightPercent}% weight
                  </span>
                </div>
              </div>

              {/* Horizontal bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(entry.score)}`}
                  style={{ width: `${Math.min(entry.score, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
