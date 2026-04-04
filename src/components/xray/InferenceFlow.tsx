'use client';

import { useState, useEffect, useCallback } from 'react';
import InfoTip from '@/components/shared/InfoTip';
import { runLiveInference, type LiveInferenceResult } from '@/lib/api/cerebras';

interface InferenceFlowProps {
  modelName: string;
  numLayers: number;
  numHeads: number;
  numKVHeads: number;
  hiddenSize: number;
  isMoE: boolean;
  numExperts: number;
  numExpertsPerTok: number;
  contextWindow: number;
  estimatedTps: number;
  vocabSize: number;
}

type Stage = 'idle' | 'input' | 'tokenize' | 'embed' | 'prefill' | 'attention' | 'ffn' | 'decode' | 'output' | 'done';

const SAMPLE_PROMPT = 'What is the capital of France?';
const SAMPLE_TOKENS = ['What', ' is', ' the', ' capital', ' of', ' France', '?'];
const SAMPLE_OUTPUT = ['The', ' capital', ' of', ' France', ' is', ' Paris', '.'];

function formatBytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export default function InferenceFlow(props: InferenceFlowProps) {
  const { numLayers, numHeads, numKVHeads, hiddenSize, isMoE, numExperts, numExpertsPerTok, estimatedTps, vocabSize, contextWindow } = props;

  const [stage, setStage] = useState<Stage>('idle');
  const [outputTokens, setOutputTokens] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveResult, setLiveResult] = useState<LiveInferenceResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Compute real metrics
  const inputTokens = SAMPLE_TOKENS.length;
  const outputTokenCount = SAMPLE_OUTPUT.length;
  const kvCachePerToken = 2 * numLayers * numKVHeads * (hiddenSize / Math.max(numHeads, 1)) * 2; // FP16
  const totalKVCache = kvCachePerToken * (inputTokens + outputTokenCount);
  const ttft = inputTokens / (estimatedTps * 8) * 1000; // prefill at ~8x decode speed, in ms
  const decodeTime = outputTokenCount / estimatedTps * 1000; // in ms
  const totalTime = ttft + decodeTime;
  const flopsPerToken = 2 * numLayers * (4 * hiddenSize * hiddenSize + 3 * hiddenSize * (isMoE ? numExpertsPerTok * 768 : hiddenSize * 3));

  const runAnimation = useCallback(() => {
    setIsRunning(true);
    setStage('idle');
    setOutputTokens([]);
    setElapsed(0);

    const stages: { key: Stage; dur: number }[] = [
      { key: 'input', dur: 700 },
      { key: 'tokenize', dur: 500 },
      { key: 'embed', dur: 400 },
      { key: 'prefill', dur: 800 },
      { key: 'attention', dur: 1000 },
      { key: 'ffn', dur: 800 },
      { key: 'decode', dur: 500 },
    ];

    let i = 0;
    const startTime = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startTime), 100);

    const advance = () => {
      if (i >= stages.length) {
        setStage('output');
        let t = 0;
        const tok = setInterval(() => {
          if (t < SAMPLE_OUTPUT.length) {
            setOutputTokens(prev => [...prev, SAMPLE_OUTPUT[t]]);
            t++;
          } else {
            clearInterval(tok);
            clearInterval(timer);
            setElapsed(Date.now() - startTime);
            setStage('done');
            setIsRunning(false);
          }
        }, 120);
        return;
      }
      setStage(stages[i].key);
      setTimeout(advance, stages[i].dur);
      i++;
    };
    setTimeout(advance, 200);
  }, []);

  useEffect(() => {
    const t = setTimeout(runAnimation, 800);
    return () => clearTimeout(t);
  }, [runAnimation]);

  const stageLabels: Record<Stage, string> = {
    idle: 'Waiting...',
    input: 'Reading prompt',
    tokenize: 'Tokenizing input',
    embed: `Embedding → dim ${hiddenSize}`,
    prefill: `Prefill: processing ${inputTokens} tokens in parallel`,
    attention: `Self-Attention: ${numHeads} heads, ${numKVHeads} KV (GQA)`,
    ffn: isMoE ? `MoE Router → ${numExpertsPerTok} of ${numExperts} experts` : `Feed-Forward: ${hiddenSize} → FFN → ${hiddenSize}`,
    decode: 'Output projection → logits',
    output: `Generating at ~${estimatedTps.toLocaleString()} tok/s`,
    done: 'Complete',
  };

  const isDone = stage === 'done';
  const isActive = (s: Stage) => stage === s;
  const isPast = (stages: Stage[]) => {
    const order: Stage[] = ['idle', 'input', 'tokenize', 'embed', 'prefill', 'attention', 'ffn', 'decode', 'output', 'done'];
    const currentIdx = order.indexOf(stage);
    return stages.some(s => order.indexOf(s) < currentIdx);
  };

  const dot = (active: boolean, past: boolean) => (
    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${active ? 'bg-[#6366F1] animate-pulse' : past ? 'bg-emerald-500' : 'bg-[#E2E8F0]'}`} />
  );

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Inference Flow
          <InfoTip text="Animated visualization of how a prompt flows through this model's architecture on Cerebras WSE-3. Shows tokenization, attention, expert routing, and output generation." />
        </h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#94A3B8]">{(elapsed / 1000).toFixed(1)}s</span>
          <button onClick={runAnimation} disabled={isRunning} className="rounded-md bg-[#6366F1] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-40">
            {isRunning ? 'Running' : 'Replay'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-4 rounded-md bg-[#F8FAFC] px-3 py-2 flex items-center gap-2">
        {dot(isRunning && !isDone, isDone)}
        <span className="text-xs font-medium text-[#475569]">{stageLabels[stage]}</span>
      </div>

      {/* Pipeline */}
      <div className="space-y-2">
        {/* Input + Tokenize */}
        <div className={`rounded-lg border p-3 transition-all ${isActive('input') || isActive('tokenize') ? 'border-[#6366F1] bg-[#6366F1]/5' : isPast(['tokenize']) ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#E2E8F0]'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {dot(isActive('input') || isActive('tokenize'), isPast(['tokenize']))}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Input → Tokenization</span>
            <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">{inputTokens} tokens · vocab {(vocabSize / 1000).toFixed(0)}K</span>
          </div>
          <p className="font-mono text-[11px] text-[#0F172A] mb-1.5">&quot;{SAMPLE_PROMPT}&quot;</p>
          {isPast(['input']) && (
            <div className="flex flex-wrap gap-1">
              {SAMPLE_TOKENS.map((tok, i) => (
                <span key={i} className="rounded bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#6366F1]">{tok}<span className="text-[#94A3B8] ml-0.5">#{i}</span></span>
              ))}
            </div>
          )}
        </div>

        {/* Embedding + Prefill */}
        <div className={`rounded-lg border p-3 transition-all ${isActive('embed') || isActive('prefill') ? 'border-[#6366F1] bg-[#6366F1]/5' : isPast(['prefill']) ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#E2E8F0]'}`}>
          <div className="flex items-center gap-2">
            {dot(isActive('embed') || isActive('prefill'), isPast(['prefill']))}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Embedding → Prefill</span>
            <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">TTFT: ~{ttft.toFixed(1)}ms · {(estimatedTps * 8).toLocaleString()} tok/s</span>
          </div>
          {isPast(['embed']) && (
            <p className="mt-1 text-[10px] text-[#475569]">Each token → {hiddenSize}-dim vector. All {inputTokens} tokens processed in parallel during prefill.</p>
          )}
        </div>

        {/* Transformer Layers */}
        <div className={`rounded-lg border p-3 transition-all ${isActive('attention') || isActive('ffn') ? 'border-[#6366F1] bg-[#6366F1]/5 shadow-sm' : isPast(['ffn']) ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#E2E8F0]'}`}>
          <div className="flex items-center gap-2 mb-2">
            {dot(isActive('attention') || isActive('ffn'), isPast(['ffn']))}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">×{numLayers} Transformer Layers</span>
            <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">KV cache: {formatBytes(totalKVCache)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-md border p-2 ${isActive('attention') ? 'border-emerald-300 bg-emerald-50' : 'border-[#E2E8F0]'}`}>
              <p className="text-[9px] font-bold text-emerald-700">Self-Attention (GQA)</p>
              <p className="text-[9px] text-[#475569]">{numHeads}Q × {numKVHeads}KV · dim {hiddenSize}</p>
              {isActive('attention') && (
                <div className="mt-1 flex gap-px">{Array.from({ length: Math.min(16, numHeads) }).map((_, i) => <div key={i} className="h-2 w-2 rounded-sm bg-emerald-400" style={{ opacity: 0.3 + (i / 16) * 0.7, animationDelay: `${i * 60}ms` }} />)}{numHeads > 16 && <span className="text-[7px] text-emerald-500 self-end ml-0.5">+{numHeads - 16}</span>}</div>
              )}
            </div>
            <div className={`rounded-md border p-2 ${isActive('ffn') ? 'border-purple-300 bg-purple-50' : 'border-[#E2E8F0]'}`}>
              <p className="text-[9px] font-bold text-purple-700">{isMoE ? 'MoE Expert Routing' : 'Feed-Forward'}</p>
              <p className="text-[9px] text-[#475569]">{isMoE ? `Router → ${numExpertsPerTok} of ${numExperts} experts` : `${hiddenSize} → FFN → ${hiddenSize}`}</p>
              {isActive('ffn') && isMoE && (
                <div className="mt-1 flex gap-px flex-wrap">{Array.from({ length: Math.min(16, numExperts) }).map((_, i) => <div key={i} className={`h-2 w-2 rounded-sm ${i < numExpertsPerTok ? 'bg-purple-500' : 'bg-purple-200'}`} />)}{numExperts > 16 && <span className="text-[7px] text-purple-500 self-end ml-0.5">+{numExperts - 16}</span>}</div>
              )}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className={`rounded-lg border p-3 transition-all ${isActive('decode') || isActive('output') || isDone ? 'border-emerald-300 bg-emerald-50/50' : 'border-[#E2E8F0]'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {dot(isActive('decode') || isActive('output'), isDone)}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Autoregressive Decode</span>
            <span className="ml-auto font-mono text-[10px] text-emerald-600">{estimatedTps.toLocaleString()} tok/s · {decodeTime.toFixed(1)}ms for {outputTokenCount} tokens</span>
          </div>
          <div className="min-h-[20px] flex flex-wrap items-center gap-0.5">
            {outputTokens.map((tok, i) => (
              <span key={i} className="font-mono text-xs text-[#0F172A] animate-fade-in">{tok}</span>
            ))}
            {(isActive('output') || isActive('decode')) && <span className="w-1.5 h-4 bg-[#6366F1] animate-pulse rounded-sm" />}
          </div>
        </div>
      </div>

      {/* Inference metrics summary */}
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[
          { label: 'Input Tokens', value: String(inputTokens), tip: 'Prompt tokens processed during prefill phase' },
          { label: 'Output Tokens', value: isDone ? String(outputTokenCount) : '...', tip: 'Generated tokens during autoregressive decode' },
          { label: 'TTFT', value: isDone ? `${ttft.toFixed(1)}ms` : '...', tip: 'Time to First Token — latency before output starts' },
          { label: 'Total Time', value: isDone ? `${totalTime.toFixed(1)}ms` : '...', tip: 'End-to-end latency (TTFT + decode time)' },
          { label: 'KV Cache', value: isDone ? formatBytes(totalKVCache) : '...', tip: 'Memory consumed by attention key/value cache for this request' },
        ].map((m) => (
          <div key={m.label} className={`rounded-md px-2 py-1.5 text-center ${isDone ? 'bg-emerald-50' : 'bg-[#F8FAFC]'}`}>
            <p className={`font-mono text-sm font-bold ${isDone ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>{m.value}</p>
            <p className="text-[8px] text-[#94A3B8] uppercase">{m.label}<InfoTip text={m.tip} /></p>
          </div>
        ))}
      </div>

      {/* Live Cerebras Test */}
      <div className="mt-3 rounded-lg border border-[#6366F1]/20 bg-[#6366F1]/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6366F1]">
              Live Cerebras Inference
              <InfoTip text="Send a real request to Cerebras Cloud (Llama 3.1-8B) and measure actual TTFT, decode speed, and throughput. Network latency included." />
            </span>
          </div>
          <button
            onClick={async () => {
              setLiveLoading(true);
              try {
                const result = await runLiveInference(SAMPLE_PROMPT, props.modelName);
                setLiveResult(result);
              } catch { /* ignore */ }
              setLiveLoading(false);
            }}
            disabled={liveLoading}
            className="rounded-md bg-[#6366F1] px-3 py-1 text-[10px] font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-40"
          >
            {liveLoading ? 'Testing...' : liveResult ? 'Retest' : 'Run Live Test'}
          </button>
        </div>

        {liveResult && (
          <div className="grid grid-cols-5 gap-2">
            <div className="rounded-md bg-white px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-[#6366F1]">{liveResult.tokens_per_second.toLocaleString()}</p>
              <p className="text-[8px] text-[#94A3B8] uppercase">Tok/s (real)</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-[#0F172A]">{liveResult.timing.prompt_time_ms.toFixed(1)}ms</p>
              <p className="text-[8px] text-[#94A3B8] uppercase">TTFT (real)</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-[#0F172A]">{liveResult.timing.completion_time_ms.toFixed(1)}ms</p>
              <p className="text-[8px] text-[#94A3B8] uppercase">Decode time</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-[#0F172A]">{liveResult.usage.completion_tokens}</p>
              <p className="text-[8px] text-[#94A3B8] uppercase">Output tokens</p>
            </div>
            <div className="rounded-md bg-white px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-[#94A3B8]">{liveResult.timing.wall_time_ms.toFixed(0)}ms</p>
              <p className="text-[8px] text-[#94A3B8] uppercase">Wall time</p>
            </div>
          </div>
        )}

        {liveResult && (
          <div className="mt-2 rounded-md bg-white px-3 py-2">
            <p className="text-[10px] text-[#94A3B8] mb-1">Model: <span className="font-medium text-[#475569]">{liveResult.model}</span></p>
            <p className="font-mono text-[11px] text-[#0F172A]">&quot;{liveResult.content.slice(0, 200)}{liveResult.content.length > 200 ? '...' : ''}&quot;</p>
          </div>
        )}

        {!liveResult && !liveLoading && (
          <p className="text-[10px] text-[#94A3B8]">Click &quot;Run Live Test&quot; to send a real request to Cerebras Cloud and measure actual inference timing.</p>
        )}
      </div>
    </div>
  );
}
