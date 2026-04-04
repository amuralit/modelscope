'use client';

import { useState, useEffect, useCallback } from 'react';

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

type Stage = 'idle' | 'input' | 'tokenize' | 'embed' | 'attention' | 'ffn' | 'experts' | 'decode' | 'output' | 'done';

const STAGES: { key: Stage; label: string; duration: number }[] = [
  { key: 'input', label: 'Prompt Input', duration: 800 },
  { key: 'tokenize', label: 'Tokenization', duration: 600 },
  { key: 'embed', label: 'Token Embedding', duration: 500 },
  { key: 'attention', label: 'Self-Attention (GQA)', duration: 1200 },
  { key: 'ffn', label: 'Feed-Forward / Experts', duration: 1000 },
  { key: 'decode', label: 'Output Projection', duration: 600 },
  { key: 'output', label: 'Token Generation', duration: 800 },
];

const SAMPLE_PROMPT = 'What is the capital of France?';
const SAMPLE_TOKENS = ['What', ' is', ' the', ' capital', ' of', ' France', '?'];
const SAMPLE_OUTPUT_TOKENS = ['The', ' capital', ' of', ' France', ' is', ' Paris', '.'];

export default function InferenceFlow(props: InferenceFlowProps) {
  const { numLayers, numHeads, numKVHeads, hiddenSize, isMoE, numExperts, numExpertsPerTok, estimatedTps, vocabSize } = props;

  const [stage, setStage] = useState<Stage>('idle');
  const [stageIndex, setStageIndex] = useState(-1);
  const [outputTokens, setOutputTokens] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAnimation = useCallback(() => {
    setIsRunning(true);
    setStage('idle');
    setStageIndex(-1);
    setOutputTokens([]);

    let i = 0;
    const advance = () => {
      if (i >= STAGES.length) {
        // Output tokens one by one
        let t = 0;
        const tokenInterval = setInterval(() => {
          if (t < SAMPLE_OUTPUT_TOKENS.length) {
            setOutputTokens(prev => [...prev, SAMPLE_OUTPUT_TOKENS[t]]);
            t++;
          } else {
            clearInterval(tokenInterval);
            setStage('done');
            setIsRunning(false);
          }
        }, 150);
        return;
      }
      setStage(STAGES[i].key);
      setStageIndex(i);
      const dur = STAGES[i].duration;
      i++;
      setTimeout(advance, dur);
    };
    setTimeout(advance, 300);
  }, []);

  // Auto-play on mount
  useEffect(() => {
    const t = setTimeout(runAnimation, 1000);
    return () => clearTimeout(t);
  }, [runAnimation]);

  const activeStage = stageIndex >= 0 ? STAGES[stageIndex] : null;
  const progress = stageIndex >= 0 ? ((stageIndex + 1) / STAGES.length) * 100 : 0;

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Inference Flow Visualization</h3>
        <button
          onClick={runAnimation}
          disabled={isRunning}
          className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#4F46E5] disabled:opacity-40"
        >
          {isRunning ? 'Running...' : 'Replay'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#6366F1] transition-all duration-500"
          style={{ width: stage === 'done' ? '100%' : `${progress}%` }}
        />
      </div>

      {/* Flow diagram */}
      <div className="relative">
        {/* Input section */}
        <div className={`mb-3 rounded-lg border p-3 transition-all duration-300 ${
          stage === 'input' || stage === 'tokenize' ? 'border-[#6366F1] bg-[#6366F1]/5' : 'border-[#E2E8F0] bg-[#F8FAFC]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full ${stage === 'input' ? 'bg-[#6366F1] animate-pulse' : stage !== 'idle' ? 'bg-emerald-500' : 'bg-[#CBD5E1]'}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Prompt Input</span>
          </div>
          <p className="font-mono text-xs text-[#0F172A]">{SAMPLE_PROMPT}</p>
          {(stage === 'tokenize' || (stageIndex > 0)) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {SAMPLE_TOKENS.map((tok, i) => (
                <span
                  key={i}
                  className="rounded bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#6366F1] animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {tok}
                </span>
              ))}
              <span className="text-[10px] text-[#94A3B8] self-center ml-1">{SAMPLE_TOKENS.length} tokens</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-1">
          <svg className={`h-5 w-5 transition-colors ${stageIndex >= 2 ? 'text-[#6366F1]' : 'text-[#E2E8F0]'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Embedding */}
        <div className={`mb-3 rounded-lg border p-3 transition-all duration-300 ${
          stage === 'embed' ? 'border-[#6366F1] bg-[#6366F1]/5' : stageIndex >= 2 ? 'border-emerald-200 bg-emerald-50/50' : 'border-[#E2E8F0] bg-[#F8FAFC]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${stage === 'embed' ? 'bg-[#6366F1] animate-pulse' : stageIndex >= 2 ? 'bg-emerald-500' : 'bg-[#CBD5E1]'}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Token Embedding</span>
            </div>
            <span className="font-mono text-[10px] text-[#94A3B8]">vocab {(vocabSize/1000).toFixed(0)}K → dim {hiddenSize}</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-1">
          <svg className={`h-5 w-5 transition-colors ${stageIndex >= 3 ? 'text-[#6366F1]' : 'text-[#E2E8F0]'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Transformer layers */}
        <div className={`mb-3 rounded-lg border p-3 transition-all duration-300 ${
          stage === 'attention' || stage === 'ffn' || stage === 'experts' ? 'border-[#6366F1] bg-[#6366F1]/5 shadow-sm shadow-[#6366F1]/10' : stageIndex >= 5 ? 'border-emerald-200 bg-emerald-50/50' : 'border-[#E2E8F0] bg-[#F8FAFC]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${(stage === 'attention' || stage === 'ffn') ? 'bg-[#6366F1] animate-pulse' : stageIndex >= 5 ? 'bg-emerald-500' : 'bg-[#CBD5E1]'}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Transformer Layers</span>
            </div>
            <span className="font-mono text-[10px] text-[#94A3B8]">×{numLayers} layers</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Self-Attention */}
            <div className={`rounded-md border p-2.5 transition-all duration-300 ${
              stage === 'attention' ? 'border-emerald-300 bg-emerald-50' : 'border-[#E2E8F0] bg-white'
            }`}>
              <p className="text-[10px] font-semibold text-emerald-700 mb-1">Self-Attention (GQA)</p>
              <div className="space-y-0.5 text-[9px] text-[#475569]">
                <p>{numHeads} query heads</p>
                <p>{numKVHeads} KV heads (shared)</p>
                <p>dim {hiddenSize}</p>
              </div>
              {stage === 'attention' && (
                <div className="mt-1.5 flex gap-0.5">
                  {Array.from({ length: Math.min(8, numHeads) }).map((_, i) => (
                    <div key={i} className="h-3 w-3 rounded-sm bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 100}ms`, opacity: 0.4 + (i * 0.08) }} />
                  ))}
                  {numHeads > 8 && <span className="text-[8px] text-emerald-600 self-end">+{numHeads - 8}</span>}
                </div>
              )}
            </div>

            {/* FFN / Experts */}
            <div className={`rounded-md border p-2.5 transition-all duration-300 ${
              stage === 'ffn' ? 'border-purple-300 bg-purple-50' : 'border-[#E2E8F0] bg-white'
            }`}>
              <p className="text-[10px] font-semibold text-purple-700 mb-1">
                {isMoE ? `MoE Router → Experts` : 'Feed-Forward Network'}
              </p>
              <div className="space-y-0.5 text-[9px] text-[#475569]">
                {isMoE ? (
                  <>
                    <p>{numExperts} experts total</p>
                    <p>{numExpertsPerTok} active per token</p>
                  </>
                ) : (
                  <p>dim {hiddenSize} → FFN → dim {hiddenSize}</p>
                )}
              </div>
              {stage === 'ffn' && isMoE && (
                <div className="mt-1.5 flex gap-0.5 flex-wrap">
                  {Array.from({ length: Math.min(12, numExperts) }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-sm transition-all duration-300 ${i < numExpertsPerTok ? 'bg-purple-500 scale-110' : 'bg-purple-200'}`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                  {numExperts > 12 && <span className="text-[8px] text-purple-500 self-end">+{numExperts - 12}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Layer iteration indicator */}
          {(stage === 'attention' || stage === 'ffn') && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full bg-[#6366F1] rounded-full animate-pulse" style={{ width: stage === 'ffn' ? '75%' : '35%' }} />
              </div>
              <span className="text-[9px] text-[#94A3B8] font-mono">
                {stage === 'attention' ? `L1/${numLayers}` : `L${numLayers}/${numLayers}`}
              </span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-1">
          <svg className={`h-5 w-5 transition-colors ${stageIndex >= 5 ? 'text-[#6366F1]' : 'text-[#E2E8F0]'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Output section */}
        <div className={`rounded-lg border p-3 transition-all duration-300 ${
          stage === 'decode' || stage === 'output' || stage === 'done' ? 'border-emerald-300 bg-emerald-50/50' : 'border-[#E2E8F0] bg-[#F8FAFC]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${stage === 'decode' || stage === 'output' ? 'bg-emerald-500 animate-pulse' : stage === 'done' ? 'bg-emerald-500' : 'bg-[#CBD5E1]'}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Output Generation</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-600">{estimatedTps.toLocaleString()} tok/s on WSE-3</span>
          </div>
          <div className="min-h-[24px] flex flex-wrap gap-0.5">
            {outputTokens.map((tok, i) => (
              <span
                key={i}
                className="font-mono text-xs text-[#0F172A] animate-fade-in"
              >
                {tok}
              </span>
            ))}
            {(stage === 'output' || stage === 'decode') && (
              <span className="inline-block w-2 h-4 bg-[#6366F1] animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: 'Layers', value: `${numLayers}`, active: stage === 'attention' || stage === 'ffn' },
          { label: 'Attention', value: `${numHeads}h / ${numKVHeads}kv`, active: stage === 'attention' },
          { label: isMoE ? 'Experts' : 'FFN', value: isMoE ? `${numExpertsPerTok}/${numExperts}` : `${hiddenSize}`, active: stage === 'ffn' },
          { label: 'Decode', value: `${estimatedTps} tok/s`, active: stage === 'output' || stage === 'done' },
        ].map((s) => (
          <div key={s.label} className={`rounded-md px-2 py-1.5 text-center transition-all duration-300 ${s.active ? 'bg-[#6366F1]/10 ring-1 ring-[#6366F1]/20' : 'bg-[#F8FAFC]'}`}>
            <p className={`font-mono text-sm font-bold ${s.active ? 'text-[#6366F1]' : 'text-[#0F172A]'}`}>{s.value}</p>
            <p className="text-[8px] text-[#94A3B8] uppercase">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
