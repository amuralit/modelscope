'use client';

interface SpeedResult {
  use_case: string;
  elasticity_score: number;
  chain_steps: number;
  gpu_time_seconds: number;
  cerebras_time_seconds: number;
  speedup_factor: number;
  score: number;
}

interface SpeedGaugeProps {
  speedResult: SpeedResult;
}

function formatTime(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1_000_000).toFixed(0)}µs`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

export default function SpeedGauge({ speedResult }: SpeedGaugeProps) {
  const {
    use_case,
    chain_steps,
    gpu_time_seconds,
    cerebras_time_seconds,
    speedup_factor,
    score,
  } = speedResult;

  const clampedScore = Math.max(0, Math.min(100, score));
  const scoreRatio = clampedScore / 100;

  // SVG semicircle gauge using stroke-dasharray on a circle
  // Circle parameters
  const size = 240;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2; // 113
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2;

  // The circle is rotated so the stroke starts at the left of the semicircle
  // and goes clockwise to the right (bottom half is clipped by the container).
  // dasharray: halfCircumference (visible arc) then full circumference (gap for the rest)
  const bgDasharray = `${halfCircumference} ${circumference}`;

  // Fill arc — portion of the semicircle corresponding to the score
  const fillLength = halfCircumference * scoreRatio;
  const fillDasharray = `${fillLength} ${circumference}`;

  // Marker position: angle from left (PI) to right (0), going over the top
  const markerAngle = Math.PI * (1 - scoreRatio);
  const cx = size / 2;
  const cy = size / 2;
  const markerX = cx + radius * Math.cos(markerAngle);
  const markerY = cy - radius * Math.sin(markerAngle);

  // Score color
  const scoreColor =
    clampedScore >= 60 ? '#059669' : clampedScore >= 30 ? '#D97706' : '#DC2626';

  // Bar widths for comparison
  const gpuBarPct = 90;
  const cerebrasBarPct = Math.max(
    3,
    (cerebras_time_seconds / Math.max(gpu_time_seconds, 0.001)) * gpuBarPct,
  );

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      <h3 className="mb-2 text-sm font-semibold text-[#0F172A]">
        Speed Sensitivity
      </h3>

      {/* Gauge */}
      <div className="flex flex-col items-center">
        {/* Semicircle container: clip bottom half */}
        <div
          style={{
            width: size,
            height: size / 2,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ display: 'block' }}
          >
            {/* Background arc (gray) */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={bgDasharray}
              transform={`rotate(180 ${cx} ${cy})`}
            />

            {/* Colored zone underlay: red, amber, green segments */}
            {/* Red zone: 0-30% */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#FEE2E2"
              strokeWidth={strokeWidth}
              strokeDasharray={`${halfCircumference * 0.3} ${circumference}`}
              transform={`rotate(180 ${cx} ${cy})`}
            />
            {/* Amber zone: 30-60% */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#FEF3C7"
              strokeWidth={strokeWidth}
              strokeDasharray={`${halfCircumference * 0.3} ${circumference}`}
              strokeDashoffset={`${-halfCircumference * 0.3}`}
              transform={`rotate(180 ${cx} ${cy})`}
            />
            {/* Green zone: 60-100% */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#D1FAE5"
              strokeWidth={strokeWidth}
              strokeDasharray={`${halfCircumference * 0.4} ${circumference}`}
              strokeDashoffset={`${-halfCircumference * 0.6}`}
              transform={`rotate(180 ${cx} ${cy})`}
            />

            {/* Score fill arc (solid color based on score) */}
            {scoreRatio > 0.01 && (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={fillDasharray}
                transform={`rotate(180 ${cx} ${cy})`}
                style={{
                  transition: 'stroke-dasharray 0.6s ease-out',
                }}
              />
            )}

            {/* Score position marker dot */}
            {scoreRatio > 0.01 && (
              <circle
                cx={markerX}
                cy={markerY}
                r={7}
                fill={scoreColor}
                stroke="white"
                strokeWidth={2.5}
              />
            )}
          </svg>
        </div>

        {/* Score number centered below gauge */}
        <div className="-mt-4 flex flex-col items-center">
          <span
            className="font-mono text-4xl font-bold"
            style={{ color: scoreColor }}
          >
            {clampedScore}
          </span>
          <span className="text-xs text-[#94A3B8]">/ 100</span>
        </div>

        {/* Min / Max labels */}
        <div
          className="flex justify-between text-xs font-medium text-[#94A3B8]"
          style={{ width: size - strokeWidth, marginTop: -8 }}
        >
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Use case badge */}
      <div className="mb-5 mt-2 flex justify-center">
        <span className="rounded-full bg-[#6366F1]/10 px-3 py-1 text-xs font-medium text-[#6366F1] ring-1 ring-inset ring-[#6366F1]/20">
          {use_case.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Chain latency comparison */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#475569]">
          Chain Latency Comparison
        </p>

        {/* Chain formula */}
        <div className="mb-4 flex items-center justify-center gap-2 text-sm">
          <span className="rounded bg-[#E2E8F0] px-2 py-0.5 font-mono text-[#0F172A]">
            {chain_steps} steps
          </span>
          <span className="text-[#94A3B8]">&times;</span>
          <span className="rounded bg-[#E2E8F0] px-2 py-0.5 font-mono text-[#0F172A]">
            inference
          </span>
          <span className="text-[#94A3B8]">=</span>
          <span className="rounded bg-[#E2E8F0] px-2 py-0.5 font-mono text-[#0F172A]">
            total
          </span>
        </div>

        {/* GPU bar */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-16 text-right text-xs font-medium text-[#475569]">GPU</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-7 rounded-md bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full rounded-md bg-red-400"
                  style={{ width: `${gpuBarPct}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-xs font-semibold text-[#0F172A]">
                {formatTime(gpu_time_seconds)}
              </span>
            </div>
          </div>

          {/* Cerebras bar */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-right text-xs font-medium text-[#475569]">Cerebras</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-7 rounded-md bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full rounded-md bg-emerald-400"
                  style={{ width: `${Math.min(cerebrasBarPct, 100)}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-xs font-semibold text-[#0F172A]">
                {formatTime(cerebras_time_seconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Speedup callout */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
          <span className="text-xs font-medium text-[#475569]">Speedup:</span>
          <span className="font-mono text-xl font-bold text-emerald-600">
            {speedup_factor.toFixed(1)}x
          </span>
          <span className="text-xs text-[#94A3B8]">faster on Cerebras</span>
        </div>
      </div>
    </div>
  );
}
