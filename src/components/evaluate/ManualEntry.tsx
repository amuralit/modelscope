'use client';

import { useState, useCallback } from 'react';
import type { ManualModelSpec } from '@/lib/types/model';

interface ManualEntryProps {
  onSubmit: (spec: ManualModelSpec) => void;
}

/* ------------------------------------------------------------------ */
/*  Preset templates                                                   */
/* ------------------------------------------------------------------ */

interface Preset {
  label: string;
  category: string;
  spec: Partial<ManualModelSpec>;
}

const PRESETS: Preset[] = [
  {
    label: 'Llama 3.3 70B (Dense)',
    category: 'Dense',
    spec: {
      modelType: 'llama', parameterCount: 70, numHiddenLayers: 80,
      numAttentionHeads: 64, numKeyValueHeads: 8, hiddenSize: 8192,
      intermediateSize: 28672, vocabSize: 128256, maxPositionEmbeddings: 131072,
      isMoE: false,
    },
  },
  {
    label: 'Gemma 3 27B (Dense)',
    category: 'Dense',
    spec: {
      modelType: 'gemma3', parameterCount: 27, numHiddenLayers: 62,
      numAttentionHeads: 32, numKeyValueHeads: 16, hiddenSize: 5376,
      intermediateSize: 21504, vocabSize: 256000, maxPositionEmbeddings: 131072,
      isMoE: false,
    },
  },
  {
    label: 'Mistral Small 24B (Dense)',
    category: 'Dense',
    spec: {
      modelType: 'mistral', parameterCount: 24, numHiddenLayers: 56,
      numAttentionHeads: 32, numKeyValueHeads: 8, hiddenSize: 5120,
      intermediateSize: 14336, vocabSize: 32768, maxPositionEmbeddings: 32768,
      isMoE: false,
    },
  },
  {
    label: 'Qwen3 30B-A3B (MoE)',
    category: 'MoE',
    spec: {
      modelType: 'qwen3_moe', parameterCount: 30, numHiddenLayers: 48,
      numAttentionHeads: 32, numKeyValueHeads: 4, hiddenSize: 2048,
      intermediateSize: 6144, vocabSize: 151936, maxPositionEmbeddings: 40960,
      isMoE: true, numLocalExperts: 128, numExpertsPerTok: 8,
    },
  },
  {
    label: 'Llama 4 Scout 17B-16E (MoE)',
    category: 'MoE',
    spec: {
      modelType: 'llama-moe', parameterCount: 109, numHiddenLayers: 48,
      numAttentionHeads: 64, numKeyValueHeads: 8, hiddenSize: 5120,
      intermediateSize: 3072, vocabSize: 202048, maxPositionEmbeddings: 131072,
      isMoE: true, numLocalExperts: 16, numExpertsPerTok: 1,
    },
  },
  {
    label: 'DeepSeek V3 (MoE)',
    category: 'MoE',
    spec: {
      modelType: 'deepseek_v3', parameterCount: 671, numHiddenLayers: 61,
      numAttentionHeads: 128, numKeyValueHeads: 128, hiddenSize: 7168,
      intermediateSize: 18432, vocabSize: 129280, maxPositionEmbeddings: 131072,
      isMoE: true, numLocalExperts: 256, numExpertsPerTok: 8,
    },
  },
  {
    label: 'Custom — start blank',
    category: 'Custom',
    spec: {},
  },
];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const INPUT_CLS = `
  w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5
  text-sm text-[#0F172A] placeholder-[#94A3B8]
  outline-none transition-colors focus:border-[#6366F1]
`;

const LABEL_CLS = 'block mb-1 text-xs font-medium text-[#475569]';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ManualEntry({ onSubmit }: ManualEntryProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [modelName, setModelName] = useState('');
  const [org, setOrg] = useState('');
  const [params, setParams] = useState('');
  const [activeParams, setActiveParams] = useState('');
  const [archType, setArchType] = useState<'Dense' | 'MoE'>('Dense');
  const [layers, setLayers] = useState('');
  const [heads, setHeads] = useState('');
  const [kvHeads, setKvHeads] = useState('');
  const [hidden, setHidden] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [experts, setExperts] = useState('');
  const [expertsPerTok, setExpertsPerTok] = useState('');
  const [contextWindow, setContextWindow] = useState('');
  const [vocabSize, setVocabSize] = useState('');

  const applyPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset.label);
    const s = preset.spec;
    if (s.modelType) setModelName(preset.label.split('(')[0].trim());
    if (s.parameterCount) setParams(String(s.parameterCount));
    setArchType(s.isMoE ? 'MoE' : 'Dense');
    if (s.numHiddenLayers) setLayers(String(s.numHiddenLayers));
    if (s.numAttentionHeads) setHeads(String(s.numAttentionHeads));
    if (s.numKeyValueHeads) setKvHeads(String(s.numKeyValueHeads));
    if (s.hiddenSize) setHidden(String(s.hiddenSize));
    if (s.intermediateSize) setIntermediate(String(s.intermediateSize));
    if (s.numLocalExperts) setExperts(String(s.numLocalExperts));
    if (s.numExpertsPerTok) setExpertsPerTok(String(s.numExpertsPerTok));
    if (s.maxPositionEmbeddings) setContextWindow(String(s.maxPositionEmbeddings));
    if (s.vocabSize) setVocabSize(String(s.vocabSize));
    if (preset.category !== 'Custom') setShowAdvanced(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const paramCount = parseFloat(params);
    if (!modelName.trim() || !paramCount) return;

    const spec: ManualModelSpec = {
      modelName: modelName.trim(),
      modelType: archType === 'MoE' ? 'moe' : 'dense',
      parameterCount: paramCount,
      numHiddenLayers: parseInt(layers) || 32,
      numAttentionHeads: parseInt(heads) || 32,
      numKeyValueHeads: parseInt(kvHeads) || parseInt(heads) || 32,
      hiddenSize: parseInt(hidden) || 4096,
      intermediateSize: parseInt(intermediate) || 11008,
      vocabSize: parseInt(vocabSize) || 32000,
      maxPositionEmbeddings: parseInt(contextWindow) || 8192,
      isMoE: archType === 'MoE',
      numLocalExperts: archType === 'MoE' ? (parseInt(experts) || 8) : undefined,
      numExpertsPerTok: archType === 'MoE' ? (parseInt(expertsPerTok) || 2) : undefined,
    };
    onSubmit(spec);
  }, [modelName, params, archType, layers, heads, kvHeads, hidden, intermediate, vocabSize, contextWindow, experts, expertsPerTok, onSubmit]);

  const isValid = modelName.trim() && parseFloat(params) > 0;

  return (
    <div className="w-full space-y-6">
      {/* Step 1: Choose a preset or start blank */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[#0F172A]">
          Start from a template or enter specs manually
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-all ${
                selectedPreset === preset.label
                  ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1] ring-1 ring-[#6366F1]/20'
                  : 'border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]'
              }`}
            >
              <span className="font-medium">{preset.label.split('(')[0].trim()}</span>
              {preset.category !== 'Custom' && (
                <span className={`mt-0.5 block text-[10px] ${
                  selectedPreset === preset.label ? 'text-[#6366F1]/70' : 'text-[#94A3B8]'
                }`}>
                  {preset.category}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Essential fields (always visible) */}
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#475569]">
          Model Basics
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL_CLS}>Model name *</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. My-Model-70B"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Organization</label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g. my-org"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Total parameters (B) *</label>
            <input
              type="number"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="e.g. 70"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={LABEL_CLS}>Architecture</label>
            <select
              value={archType}
              onChange={(e) => setArchType(e.target.value as 'Dense' | 'MoE')}
              className={INPUT_CLS}
            >
              <option value="Dense">Dense</option>
              <option value="MoE">MoE</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Context window</label>
            <input
              type="number"
              value={contextWindow}
              onChange={(e) => setContextWindow(e.target.value)}
              placeholder="e.g. 131072"
              className={INPUT_CLS}
            />
          </div>
          {archType === 'MoE' && (
            <>
              <div>
                <label className={LABEL_CLS}>Total experts</label>
                <input
                  type="number"
                  value={experts}
                  onChange={(e) => setExperts(e.target.value)}
                  placeholder="e.g. 128"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Active experts/token</label>
                <input
                  type="number"
                  value={expertsPerTok}
                  onChange={(e) => setExpertsPerTok(e.target.value)}
                  placeholder="e.g. 8"
                  className={INPUT_CLS}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Step 3: Advanced architecture details (collapsible) */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {showAdvanced ? 'Hide' : 'Show'} architecture details
          {!showAdvanced && (
            <span className="text-xs text-[#94A3B8] font-normal">(optional — smart defaults applied)</span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLS}>Layers</label>
                <input type="number" value={layers} onChange={(e) => setLayers(e.target.value)} placeholder="e.g. 80" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Attention heads</label>
                <input type="number" value={heads} onChange={(e) => setHeads(e.target.value)} placeholder="e.g. 64" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>KV heads</label>
                <input type="number" value={kvHeads} onChange={(e) => setKvHeads(e.target.value)} placeholder="e.g. 8" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Hidden size</label>
                <input type="number" value={hidden} onChange={(e) => setHidden(e.target.value)} placeholder="e.g. 8192" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>FFN / Intermediate size</label>
                <input type="number" value={intermediate} onChange={(e) => setIntermediate(e.target.value)} placeholder="e.g. 28672" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Vocab size</label>
                <input type="number" value={vocabSize} onChange={(e) => setVocabSize(e.target.value)} placeholder="e.g. 128256" className={INPUT_CLS} />
              </div>
              {archType === 'MoE' && (
                <div>
                  <label className={LABEL_CLS}>Active params (B)</label>
                  <input type="number" value={activeParams} onChange={(e) => setActiveParams(e.target.value)} placeholder="e.g. 3" className={INPUT_CLS} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="rounded-lg bg-[#6366F1] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Run X-ray on manual spec
        </button>
        <p className="text-xs text-[#94A3B8]">
          Use this mode for pre-release or NDA models without a public HuggingFace page.
        </p>
      </div>
    </div>
  );
}
