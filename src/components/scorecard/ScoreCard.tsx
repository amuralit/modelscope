'use client';

import InfoTip from '@/components/shared/InfoTip';

interface ScoreCardProps {
  compositeScore: number;
  verdict: 'GO' | 'EVALUATE' | 'SKIP';
  verdictLabel: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getScoreTextClass(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function getVerdictBadge(verdict: 'GO' | 'EVALUATE' | 'SKIP'): {
  label: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
} {
  switch (verdict) {
    case 'GO':
      return {
        label: 'GO \u2014 Launch immediately',
        bgClass: 'bg-emerald-500/15',
        textClass: 'text-emerald-600',
        ringClass: 'ring-emerald-500/30',
      };
    case 'EVALUATE':
      return {
        label: 'EVALUATE \u2014 Needs PM judgment',
        bgClass: 'bg-amber-500/15',
        textClass: 'text-amber-600',
        ringClass: 'ring-amber-500/30',
      };
    case 'SKIP':
      return {
        label: 'SKIP \u2014 Low Cerebras fit',
        bgClass: 'bg-red-500/15',
        textClass: 'text-red-600',
        ringClass: 'ring-red-500/30',
      };
  }
}

export default function ScoreCard({
  compositeScore,
  verdict,
  verdictLabel,
}: ScoreCardProps) {
  const color = getScoreColor(compositeScore);
  const textClass = getScoreTextClass(compositeScore);
  const badge = getVerdictBadge(verdict);

  // SVG circular progress ring
  const radius = 70;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (compositeScore / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="rounded-[16px] border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center">
      {/* Circular progress ring with score */}
      <div className="relative mx-auto mb-6 h-[180px] w-[180px]">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 160 160"
        >
          {/* Background ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Score number centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono text-5xl font-bold ${textClass}`}
          >
            {compositeScore}
          </span>
          <span className="mt-1 text-xs font-medium tracking-wider text-[#94A3B8] uppercase">
            / 100
          </span>
        </div>
      </div>

      {/* Verdict label */}
      <p className="mb-3 text-sm font-medium text-[#475569]">
        {verdictLabel}
      </p>

      {/* Verdict badge */}
      <span
        className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ${badge.bgClass} ${badge.textClass} ${badge.ringClass}`}
      >
        {badge.label}
        <InfoTip text="Weighted composite of 7 analysis modules. GO (\u226580): launch immediately. EVALUATE (50-79): needs PM judgment. SKIP (<50): low Cerebras fit." />
      </span>
    </div>
  );
}
