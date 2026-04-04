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

  // Gauge parameters
  const size = 280;
  const cx = size / 2;
  const cy = 130;
  const r = 95;
  const strokeW = 14;

  // Semicircle from 180° to 0° (left to right, over the top)
  // In SVG, angles go clockwise from the positive X axis
  // We want: left end at 180°, right end at 0°
  const totalArc = Math.PI; // semicircle
  const clampedScore = Math.max(0, Math.min(100, score));
  const scoreRatio = clampedScore / 100;

  // Arc endpoints using standard polar coords (SVG Y is inverted)
  const startX = cx + r * Math.cos(Math.PI); // left
  const startY = cy - r * Math.sin(Math.PI); // baseline
  const endX = cx + r * Math.cos(0); // right
  const endY = cy - r * Math.sin(0); // baseline

  // Score arc endpoint: interpolate angle from PI to 0
  const scoreAngle = Math.PI * (1 - scoreRatio);
  const scoreX = cx + r * Math.cos(scoreAngle);
  const scoreY = cy - r * Math.sin(scoreAngle);

  // Background arc path (full semicircle)
  // From left to right going over the top = sweep clockwise in SVG
  const bgArc = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  // Score fill arc (partial, from left toward score position)
  const fillLargeArc = scoreRatio > 0.5 ? 1 : 0;
  const fillArc =
    scoreRatio > 0.01
      ? `M ${startX} ${startY} A ${r} ${r} 0 ${fillLargeArc} 1 ${scoreX} ${scoreY}`
      : '';

  // Needle endpoint (slightly shorter than radius)
  const needleR = r - 20;
  const needleX = cx + needleR * Math.cos(scoreAngle);
  const needleY = cy - needleR * Math.sin(scoreAngle);

  // Score color
  const scoreColor = score >= 60 ? '#059669' : score >= 30 ? '#D97706' : '#DC2626';

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
      <div className="flex justify-center">
        <svg
          width={size}
          height={200}
          viewBox={`0 0 ${size} 200`}
        >
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="40%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Background arc (gray) */}
          <path
            d={bgArc}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Score fill arc (colored gradient) */}
          {fillArc && (
            <path
              d={fillArc}
              fill="none"
              stroke="url(#gauge-gradient)"
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          )}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={scoreColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Needle hub */}
          <circle cx={cx} cy={cy} r={6} fill={scoreColor} />
          <circle cx={cx} cy={cy} r={3} fill="white" />

          {/* Needle tip dot */}
          <circle cx={scoreX} cy={scoreY} r={4} fill={scoreColor} stroke="white" strokeWidth={1.5} />

          {/* Score number */}
          <text
            x={cx}
            y={cy + 35}
            textAnchor="middle"
            fill="#0F172A"
            fontSize={36}
            fontWeight="700"
            fontFamily="var(--font-mono), monospace"
          >
            {clampedScore}
          </text>
          <text
            x={cx}
            y={cy + 52}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize={11}
          >
            / 100
          </text>

          {/* Min / Max labels */}
          <text x={startX + 5} y={cy + 18} textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight="500">
            0
          </text>
          <text x={endX - 5} y={cy + 18} textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight="500">
            100
          </text>
        </svg>
      </div>

      {/* Use case badge */}
      <div className="mb-5 flex justify-center -mt-2">
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
