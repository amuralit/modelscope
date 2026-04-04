'use client';

import { useMemo } from 'react';

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

function scoreToColor(score: number): string {
  if (score < 30) return '#EF4444';
  if (score < 60) return '#F59E0B';
  return '#10B981';
}

function scoreToGradientId(score: number): string {
  if (score < 30) return 'gauge-red';
  if (score < 60) return 'gauge-amber';
  return 'gauge-green';
}

function formatTime(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1_000_000).toFixed(0)}us`;
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

  const gaugeMetrics = useMemo(() => {
    const cx = 150;
    const cy = 140;
    const r = 110;
    const startAngle = Math.PI; // 180 degrees (left)
    const endAngle = 0; // 0 degrees (right)
    const scoreAngle = startAngle - (score / 100) * Math.PI;

    // Arc path for background
    const bgPath = describeArc(cx, cy, r, startAngle, endAngle);

    // Arc path for score fill
    const fillPath = describeArc(cx, cy, r, startAngle, scoreAngle);

    // Needle endpoint
    const needleX = cx + (r - 15) * Math.cos(scoreAngle);
    const needleY = cy - (r - 15) * Math.sin(scoreAngle);

    return { cx, cy, r, bgPath, fillPath, needleX, needleY };
  }, [score]);

  const color = scoreToColor(score);
  const gradientId = scoreToGradientId(score);

  const gpuBarW = 100;
  const cerebrasBarW = Math.max(
    4,
    (cerebras_time_seconds / gpu_time_seconds) * gpuBarW
  );

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#0F172A]">
        Speed Sensitivity
      </h3>

      {/* Gauge */}
      <div className="flex justify-center">
        <svg width={300} height={170} viewBox="0 0 300 170">
          <defs>
            <linearGradient id="gauge-green" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="gauge-amber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="gauge-red" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            d={gaugeMetrics.bgPath}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={18}
            strokeLinecap="round"
          />

          {/* Score arc */}
          <path
            d={gaugeMetrics.fillPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={18}
            strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1={gaugeMetrics.cx}
            y1={gaugeMetrics.cy}
            x2={gaugeMetrics.needleX}
            y2={gaugeMetrics.needleY}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle
            cx={gaugeMetrics.cx}
            cy={gaugeMetrics.cy}
            r={6}
            fill={color}
          />
          <circle
            cx={gaugeMetrics.cx}
            cy={gaugeMetrics.cy}
            r={3}
            fill="#FFFFFF"
          />

          {/* Score text */}
          <text
            x={gaugeMetrics.cx}
            y={gaugeMetrics.cy + 30}
            textAnchor="middle"
            fill="#0F172A"
            fontSize={28}
            fontWeight="700"
            fontFamily="monospace"
          >
            {score}
          </text>
          <text
            x={gaugeMetrics.cx}
            y={gaugeMetrics.cy + 45}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize={10}
          >
            / 100
          </text>

          {/* Min / Max labels */}
          <text x={30} y={gaugeMetrics.cy + 8} fill="#94A3B8" fontSize={10}>
            0
          </text>
          <text x={262} y={gaugeMetrics.cy + 8} fill="#94A3B8" fontSize={10}>
            100
          </text>
        </svg>
      </div>

      {/* Use case badge */}
      <div className="mb-5 flex justify-center">
        <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
          {use_case}
        </span>
      </div>

      {/* Chain multiplication diagram */}
      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#475569]">
          Chain latency comparison
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

        {/* GPU vs Cerebras bars */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 text-right text-xs text-[#475569]">GPU</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 rounded bg-red-500/60"
                  style={{ width: `${gpuBarW}%`, maxWidth: '100%' }}
                />
                <span className="whitespace-nowrap font-mono text-xs text-[#0F172A]">
                  {formatTime(gpu_time_seconds)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-20 text-right text-xs text-[#475569]">
              Cerebras
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 rounded bg-emerald-500/60"
                  style={{
                    width: `${Math.max(cerebrasBarW, 2)}%`,
                    maxWidth: '100%',
                  }}
                />
                <span className="whitespace-nowrap font-mono text-xs text-[#0F172A]">
                  {formatTime(cerebras_time_seconds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Speedup callout */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-xs text-[#475569]">Speedup:</span>
          <span className="font-mono text-lg font-bold text-emerald-600">
            {speedup_factor.toFixed(1)}x
          </span>
          <span className="text-xs text-[#94A3B8]">faster on Cerebras</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- SVG arc helper ---------- */

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);

  // Determine sweep: if start > end going clockwise in SVG coordinates
  const diff = startAngle - endAngle;
  const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;

  // We sweep clockwise in SVG (which is sweep-flag=1) from start to end
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}
