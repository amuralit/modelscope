'use client';

import InfoTip from '@/components/shared/InfoTip';

interface ArchOverviewProps {
  arch: {
    modelType: string;
    architectureFamily: string;
    attentionVariant: string;
    isMoE: boolean;
    parameterCount: number;
    activeParameters?: number;
    numLayers: number;
    numAttentionHeads: number;
    numKVHeads: number;
    hiddenSize: number;
    intermediateSize: number;
    headDim: number;
    vocabSize: number;
    contextWindow: number;
    numExperts: number;
    numExpertsPerTok: number;
    supportedFeatures: string[];
    warnings: string[];
    score: number;
  };
  wseFit?: {
    estimatedWeightBytes: number;
    estimatedKVCacheBytes: number;
    totalMemoryRequired: number;
    fitsInSRAM: boolean;
    sramUtilization: number;
  } | null;
  estimatedTps?: number;
}

function formatParams(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${bytes} B`;
}

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

function Stat({ label, value, sub, highlight, tip }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tip?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-[#6366F1]/30 bg-[#6366F1]/5' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}{tip && <InfoTip text={tip} />}</p>
      <p className={`font-mono text-lg font-bold ${highlight ? 'text-[#6366F1]' : 'text-[#0F172A]'}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#94A3B8]">{sub}</p>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: 'indigo' | 'emerald' | 'amber' | 'neutral' }) {
  const cls = {
    indigo: 'bg-[#6366F1]/10 text-[#6366F1] ring-[#6366F1]/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/20',
    neutral: 'bg-[#F1F5F9] text-[#475569] ring-[#E2E8F0]',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cls}`}>
      {text}
    </span>
  );
}

export default function ArchitectureDiagram({ arch, wseFit, estimatedTps }: ArchOverviewProps) {
  const kvCachePerToken = 2 * arch.numLayers * arch.numKVHeads * arch.headDim * 2; // FP16
  const estimatedPrefillTps = (estimatedTps ?? 1000) * 8; // prefill is ~8x decode throughput
  const fp16Bytes = arch.parameterCount * 2;
  const fp8Bytes = arch.parameterCount * 1;

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Architecture Overview <InfoTip text="Deep analysis of model architecture — layers, attention mechanism, parameter count, memory footprint, and estimated inference speeds on Cerebras WSE-3." /></h3>
        <div className="flex gap-1.5">
          <Badge
            text={arch.isMoE ? 'Mixture of Experts' : 'Dense'}
            color={arch.isMoE ? 'amber' : 'indigo'}
          />
          <Badge text={arch.attentionVariant} color="emerald" />
          <Badge text={arch.architectureFamily} color="neutral" />
        </div>
      </div>

      {/* Primary stats row */}
      <div className={`mb-3 grid gap-2 ${arch.isMoE ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <Stat
          label="Parameters"
          value={formatParams(arch.parameterCount)}
          sub={arch.isMoE && arch.activeParameters ? `${formatParams(arch.activeParameters)} active` : undefined}
          highlight
          tip="Total number of trainable parameters. For MoE models, 'active' shows parameters used per token."
        />
        <Stat
          label="Context Window"
          value={`${formatContext(arch.contextWindow)} tokens`}
          sub={`KV cache: ${formatBytes(kvCachePerToken)}/token`}
          tip="Maximum number of tokens the model can process in a single request."
        />
        <Stat
          label="Vocabulary"
          value={formatParams(arch.vocabSize)}
          sub={`Embedding: ${formatBytes(arch.vocabSize * arch.hiddenSize * 2)}`}
          tip="Number of unique tokens in the model's vocabulary. Larger vocab = better multilingual support."
        />
        {arch.isMoE && (
          <Stat
            label="Experts"
            value={`${arch.numExperts} total`}
            sub={`${arch.numExpertsPerTok} active per token`}
            tip="In MoE models, only a subset of experts activate per token, reducing compute while maintaining capacity."
          />
        )}
      </div>

      {/* Architecture details grid */}
      <div className="mb-3 grid grid-cols-5 gap-2">
        <Stat label="Layers" value={String(arch.numLayers)} />
        <Stat label="Heads" value={`${arch.numAttentionHeads}`} sub={`${arch.numKVHeads} KV`} />
        <Stat label="Head Dim" value={String(arch.headDim)} />
        <Stat label="Hidden" value={arch.hiddenSize.toLocaleString()} />
        <Stat label="FFN" value={arch.intermediateSize.toLocaleString()} />
      </div>

      {/* Performance estimates */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Stat
          label="FP16 Memory"
          value={formatBytes(fp16Bytes)}
          sub={`${Math.ceil(fp16Bytes / (44 * 1024 ** 3))} wafer(s)`}
        />
        <Stat
          label="FP8 Memory"
          value={formatBytes(fp8Bytes)}
          sub={`${Math.ceil(fp8Bytes / (44 * 1024 ** 3))} wafer(s)`}
        />
        <Stat
          label="Decode (est.)"
          value={`${(estimatedTps ?? 0).toLocaleString()} tok/s`}
          sub="Cerebras WSE-3"
          highlight
          tip="Estimated output generation speed on a single Cerebras WSE-3 wafer. Based on model size class."
        />
        <Stat
          label="Prefill (est.)"
          value={`${estimatedPrefillTps.toLocaleString()} tok/s`}
          sub="Cerebras WSE-3"
          tip="Estimated prompt processing speed. Prefill is typically 6-10x faster than decode."
        />
      </div>

      {/* KV Cache at max context */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat
          label="KV Cache / Token"
          value={formatBytes(kvCachePerToken)}
          sub={`${arch.numLayers} layers × ${arch.numKVHeads} KV heads × ${arch.headDim} dim`}
          tip="Memory needed to store key/value attention states per token. Grows with context length."
        />
        <Stat
          label="KV Cache @ Max Context"
          value={formatBytes(kvCachePerToken * arch.contextWindow)}
          sub={`${formatContext(arch.contextWindow)} tokens`}
          tip="Total KV cache memory at maximum context window. A major memory consumer for long-context models."
        />
        {wseFit && (
          <Stat
            label="Total SRAM Usage"
            value={`${(wseFit.sramUtilization * 100).toFixed(0)}%`}
            sub={wseFit.fitsInSRAM ? 'Fits in single WSE-3' : 'Multi-wafer required'}
          />
        )}
      </div>

      {/* Features + Warnings */}
      {(arch.supportedFeatures.length > 0 || arch.warnings.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {arch.supportedFeatures.map((f) => (
            <Badge key={f} text={f} color="emerald" />
          ))}
          {arch.warnings.map((w) => (
            <Badge key={w} text={w} color="amber" />
          ))}
        </div>
      )}
    </div>
  );
}
