'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts';

interface PrecisionAnalysis {
  precision: string;
  bytes: number;
  fits_single_wafer: boolean;
  wafer_count: number;
}

interface WSEFitResult {
  precision_analysis: PrecisionAnalysis[];
}

interface WSEFitChartProps {
  wseFitResult: WSEFitResult;
}

const SRAM_LIMIT_GB = 44;

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function formatGB(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)}TB`;
  return `${gb.toFixed(1)}GB`;
}

const PRECISION_COLORS: Record<string, string> = {
  FP32: '#EF4444',
  FP16: '#F59E0B',
  BF16: '#F59E0B',
  FP8: '#6366F1',
  INT8: '#6366F1',
  FP4: '#10B981',
  INT4: '#10B981',
};

function WaferChip({ filled }: { filled: boolean }) {
  return (
    <div
      className={`h-7 w-7 rounded-md border transition-colors ${
        filled
          ? 'border-indigo-500 bg-indigo-500/30'
          : 'border-[#374151] bg-[#1F2937]/40'
      }`}
    >
      <div className="flex h-full items-center justify-center">
        <div
          className={`h-3 w-3 rounded-sm ${
            filled ? 'bg-indigo-500' : 'bg-[#374151]'
          }`}
        />
      </div>
    </div>
  );
}

export default function WSEFitChart({ wseFitResult }: WSEFitChartProps) {
  const { precision_analysis } = wseFitResult;
  const [selectedIdx, setSelectedIdx] = useState(
    precision_analysis.findIndex((p) => p.fits_single_wafer) >= 0
      ? precision_analysis.findIndex((p) => p.fits_single_wafer)
      : 0
  );

  const chartData = useMemo(
    () =>
      precision_analysis.map((p) => ({
        precision: p.precision,
        sizeGB: parseFloat(bytesToGB(p.bytes).toFixed(2)),
        fits: p.fits_single_wafer,
        wafer_count: p.wafer_count,
      })),
    [precision_analysis]
  );

  const maxGB = Math.max(...chartData.map((d) => d.sizeGB), SRAM_LIMIT_GB * 1.3);

  const selected = precision_analysis[selectedIdx];

  return (
    <div className="rounded-[12px] border border-[#1F2937] bg-[#111827] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#F9FAFB]">
        WSE-3 Memory Fit
      </h3>

      {/* Precision selector */}
      <div className="mb-4 flex gap-2">
        {precision_analysis.map((p, i) => (
          <button
            key={p.precision}
            onClick={() => setSelectedIdx(i)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              i === selectedIdx
                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40'
                : 'bg-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
            }`}
          >
            {p.precision}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mb-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="#1F2937"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              domain={[0, Math.ceil(maxGB)]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#1F2937' }}
              tickLine={{ stroke: '#1F2937' }}
              tickFormatter={(v) => formatGB(v)}
            />
            <YAxis
              type="category"
              dataKey="precision"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1F2937' }}
              tickLine={false}
              width={50}
            />
            <RTooltip
              cursor={{ fill: '#1F2937', opacity: 0.4 }}
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: 8,
                fontSize: 12,
                color: '#F9FAFB',
              }}
              formatter={(value) => [`${formatGB(Number(value))}`, 'Memory']}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <ReferenceLine
              x={SRAM_LIMIT_GB}
              stroke="#EF4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `${SRAM_LIMIT_GB}GB SRAM`,
                position: 'top',
                fill: '#EF4444',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="sizeGB" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={entry.precision}
                  fill={PRECISION_COLORS[entry.precision] ?? '#6366F1'}
                  opacity={idx === selectedIdx ? 1 : 0.4}
                  stroke={idx === selectedIdx ? '#F9FAFB' : 'none'}
                  strokeWidth={idx === selectedIdx ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Selected precision details + wafer visualization */}
      <div className="flex flex-wrap items-start gap-6 rounded-lg border border-[#1F2937] bg-[#0B0F19] p-4">
        <div className="flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            {selected.precision} footprint
          </p>
          <p className="font-mono text-xl font-semibold text-[#F9FAFB]">
            {formatGB(bytesToGB(selected.bytes))}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            {selected.fits_single_wafer ? (
              <span className="text-emerald-400">Fits on a single wafer</span>
            ) : (
              <span className="text-amber-400">
                Requires multi-wafer deployment
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            Wafer count: {selected.wafer_count}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.min(selected.wafer_count, 16) }, (_, i) => (
              <WaferChip key={i} filled />
            ))}
            {selected.wafer_count > 16 && (
              <span className="flex items-center text-xs text-[#6B7280]">
                +{selected.wafer_count - 16}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
