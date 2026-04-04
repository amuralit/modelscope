'use client';

import InfoTip from '@/components/shared/InfoTip';

interface PerformanceCostProps {
  parameterCount: number;
  activeParameters?: number;
  isMoE: boolean;
  contextWindow: number;
  estimatedDecodeTps: number;
  numLayers: number;
  numKVHeads: number;
  headDim: number;
}

// ---------------------------------------------------------------------------
// Pricing heuristics
// ---------------------------------------------------------------------------

interface PricingTier {
  inputPer1M: number;
  outputPer1M: number;
}

function getCerebrasPricing(params: number): PricingTier {
  if (params < 10e9) return { inputPer1M: 0.05, outputPer1M: 0.10 };
  if (params < 30e9) return { inputPer1M: 0.10, outputPer1M: 0.20 };
  if (params < 70e9) return { inputPer1M: 0.20, outputPer1M: 0.60 };
  if (params < 200e9) return { inputPer1M: 0.50, outputPer1M: 1.50 };
  return { inputPer1M: 1.00, outputPer1M: 3.00 };
}

function getGpuPricing(params: number): PricingTier {
  if (params < 10e9) return { inputPer1M: 0.10, outputPer1M: 0.20 };
  if (params < 30e9) return { inputPer1M: 0.30, outputPer1M: 0.60 };
  if (params < 70e9) return { inputPer1M: 0.60, outputPer1M: 1.80 };
  if (params < 200e9) return { inputPer1M: 2.00, outputPer1M: 6.00 };
  return { inputPer1M: 5.00, outputPer1M: 15.00 };
}

function getGpuBaselineDecodeTps(params: number): number {
  if (params < 10e9) return 120;
  if (params < 30e9) return 60;
  if (params < 70e9) return 30;
  if (params < 200e9) return 15;
  return 8;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}k`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtDollar(d: number): string {
  if (d < 0.01) return `$${d.toFixed(4)}`;
  if (d < 1) return `$${d.toFixed(2)}`;
  return `$${d.toFixed(2)}`;
}

function fmtSeconds(s: number): string {
  if (s < 0.001) return `${(s * 1_000_000).toFixed(0)}µs`;
  if (s < 1) return `${(s * 1000).toFixed(0)}ms`;
  if (s < 60) return `${s.toFixed(2)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  tip,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tip?: string;
}) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        {label}{tip && <InfoTip text={tip} />}
      </p>
      <p className="font-mono text-lg font-bold text-[#0F172A]">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-[#94A3B8]">{subtitle}</p>
      )}
    </div>
  );
}

function ComparisonBar({
  label,
  cerebrasValue,
  gpuValue,
  cerebrasLabel,
  gpuLabel,
  unit,
  lowerIsBetter,
}: {
  label: string;
  cerebrasValue: number;
  gpuValue: number;
  cerebrasLabel: string;
  gpuLabel: string;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  const maxVal = Math.max(cerebrasValue, gpuValue);

  const cerebrasWidth = maxVal > 0 ? (cerebrasValue / maxVal) * 100 : 0;
  const gpuWidth = maxVal > 0 ? (gpuValue / maxVal) * 100 : 0;

  let speedup: number;
  if (lowerIsBetter) {
    speedup = cerebrasValue > 0 ? gpuValue / cerebrasValue : 0;
  } else {
    speedup = gpuValue > 0 ? cerebrasValue / gpuValue : 0;
  }

  const isWinning = speedup >= 1;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isWinning
              ? 'bg-[#EEF2FF] text-[#6366F1]'
              : 'bg-[#FEF2F2] text-[#EF4444]'
          }`}
        >
          {speedup >= 1 ? `${speedup.toFixed(1)}x faster` : `${(1 / speedup).toFixed(1)}x slower`}
        </span>
      </div>

      {/* Cerebras bar */}
      <div className="flex items-center gap-2">
        <span className="w-16 flex-shrink-0 text-[10px] font-medium text-[#6366F1]">
          Cerebras
        </span>
        <div className="relative h-5 flex-1 overflow-hidden rounded bg-[#F1F5F9]">
          <div
            className="flex h-full items-center rounded bg-[#6366F1] px-2 transition-all duration-500"
            style={{
              width: `${Math.max(cerebrasWidth, 8)}%`,
            }}
          >
            <span className="whitespace-nowrap text-[10px] font-bold text-white">
              {cerebrasLabel} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* GPU bar */}
      <div className="flex items-center gap-2">
        <span className="w-16 flex-shrink-0 text-[10px] font-medium text-[#94A3B8]">
          GPU
        </span>
        <div className="relative h-5 flex-1 overflow-hidden rounded bg-[#F1F5F9]">
          <div
            className="flex h-full items-center rounded bg-[#CBD5E1] px-2 transition-all duration-500"
            style={{
              width: `${Math.max(gpuWidth, 8)}%`,
            }}
          >
            <span className="whitespace-nowrap text-[10px] font-bold text-[#475569]">
              {gpuLabel} {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PerformanceCost({
  parameterCount,
  activeParameters,
  isMoE,
  contextWindow,
  estimatedDecodeTps,
  numLayers,
  numKVHeads,
  headDim,
}: PerformanceCostProps) {
  // Effective params for computation (MoE uses active params for inference)
  const effectiveParams = isMoE && activeParameters ? activeParameters : parameterCount;

  // ------ Section 1: Inference Speed Estimates ------
  const ttftMs =
    (effectiveParams / (estimatedDecodeTps * 1000)) * 1000;
  const decodeTps = estimatedDecodeTps;
  const prefillTps = estimatedDecodeTps * 8;
  const e2eLatencySeconds = ttftMs / 1000 + 500 / estimatedDecodeTps;

  // ------ Section 2: Comparison data ------
  const gpuDecodeTps = getGpuBaselineDecodeTps(effectiveParams);
  const gpuTtftMs =
    (effectiveParams / (gpuDecodeTps * 1000)) * 1000;
  const cerebrasCost =
    (getCerebrasPricing(parameterCount).inputPer1M +
      getCerebrasPricing(parameterCount).outputPer1M) /
    2;
  const gpuCost =
    (getGpuPricing(parameterCount).inputPer1M +
      getGpuPricing(parameterCount).outputPer1M) /
    2;

  // ------ Section 3: Cost Analysis ------
  const cerebrasPricing = getCerebrasPricing(parameterCount);
  const gpuPricing = getGpuPricing(parameterCount);

  // Monthly cost: 1B tokens/month, assume 50/50 input/output split
  const monthlyTokens = 1_000_000_000;
  const monthlyInputTokens = monthlyTokens / 2;
  const monthlyOutputTokens = monthlyTokens / 2;

  const cerebrasMonthlyCost =
    (monthlyInputTokens / 1_000_000) * cerebrasPricing.inputPer1M +
    (monthlyOutputTokens / 1_000_000) * cerebrasPricing.outputPer1M;
  const gpuMonthlyCost =
    (monthlyInputTokens / 1_000_000) * gpuPricing.inputPer1M +
    (monthlyOutputTokens / 1_000_000) * gpuPricing.outputPer1M;

  const savingsPercent =
    gpuMonthlyCost > 0
      ? ((gpuMonthlyCost - cerebrasMonthlyCost) / gpuMonthlyCost) * 100
      : 0;

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-5">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">
            Performance &amp; Cost Estimates <InfoTip text="Estimated inference performance and cost on Cerebras WSE-3 vs typical GPU cloud providers." />
          </h3>
          <p className="mt-0.5 text-[11px] text-[#94A3B8] break-words">
            {isMoE && activeParameters
              ? `${fmtNum(parameterCount)} total params (${fmtNum(activeParameters)} active) · ${fmtNum(contextWindow)} ctx · ${numLayers}L / ${numKVHeads}KV / ${headDim}d`
              : `${fmtNum(parameterCount)} params · ${fmtNum(contextWindow)} ctx · ${numLayers}L / ${numKVHeads}KV / ${headDim}d`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-2.5 py-1 w-fit shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
          <span className="text-[10px] font-bold text-[#6366F1]">
            Cerebras Inference
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Section 1 — Inference Speed Estimates                             */}
      {/* ================================================================= */}
      <div className="mb-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          Inference Speed Estimates
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="TTFT"
            value={fmtMs(ttftMs)}
            subtitle="Time to first token"
            tip="Time to First Token — how long before the first word appears. Critical for interactive applications."
          />
          <StatCard
            label="Decode Speed"
            value={`${fmtNum(decodeTps)} tok/s`}
            subtitle="Output generation"
            tip="Output generation speed in tokens per second on Cerebras WSE-3."
          />
          <StatCard
            label="Prefill Throughput"
            value={`${fmtNum(prefillTps)} tok/s`}
            subtitle="~8x decode speed"
            tip="Prompt processing speed. Higher = faster time to first token for long prompts."
          />
          <StatCard
            label="E2E Latency"
            value={fmtSeconds(e2eLatencySeconds)}
            subtitle="500-token response"
            tip="End-to-end time for a complete 500-token response including TTFT and decode."
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* Section 2 — Cerebras vs GPU Comparison                            */}
      {/* ================================================================= */}
      <div className="mb-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          Cerebras vs GPU Comparison
        </p>
        <div className="space-y-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <ComparisonBar
            label="Decode Speed"
            cerebrasValue={decodeTps}
            gpuValue={gpuDecodeTps}
            cerebrasLabel={fmtNum(decodeTps)}
            gpuLabel={fmtNum(gpuDecodeTps)}
            unit="tok/s"
          />
          <ComparisonBar
            label="Time to First Token"
            cerebrasValue={ttftMs}
            gpuValue={gpuTtftMs}
            cerebrasLabel={fmtMs(ttftMs)}
            gpuLabel={fmtMs(gpuTtftMs)}
            unit=""
            lowerIsBetter
          />
          <ComparisonBar
            label="Cost per 1M Tokens (avg)"
            cerebrasValue={cerebrasCost}
            gpuValue={gpuCost}
            cerebrasLabel={fmtDollar(cerebrasCost)}
            gpuLabel={fmtDollar(gpuCost)}
            unit=""
            lowerIsBetter
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* Section 3 — Cost Analysis                                         */}
      {/* ================================================================= */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          Cost Analysis
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="Input / 1M Tokens"
            value={fmtDollar(cerebrasPricing.inputPer1M)}
            subtitle={`GPU: ${fmtDollar(gpuPricing.inputPer1M)}`}
          />
          <StatCard
            label="Output / 1M Tokens"
            value={fmtDollar(cerebrasPricing.outputPer1M)}
            subtitle={`GPU: ${fmtDollar(gpuPricing.outputPer1M)}`}
          />
          <StatCard
            label="Monthly Est."
            value={fmtDollar(cerebrasMonthlyCost)}
            subtitle={`1B tok/mo · GPU: ${fmtDollar(gpuMonthlyCost)}`}
          />
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              Cost Savings vs GPU
            </p>
            <p
              className={`font-mono text-lg font-bold ${
                savingsPercent > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}
            >
              {savingsPercent > 0 ? '-' : '+'}
              {Math.abs(savingsPercent).toFixed(0)}%
            </p>
            <p className="text-[10px] text-[#94A3B8]">
              Save {fmtDollar(gpuMonthlyCost - cerebrasMonthlyCost)}/mo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
