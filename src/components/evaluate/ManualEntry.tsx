'use client';

import { useState, useCallback } from 'react';
import type { ManualModelSpec } from '@/lib/types/model';

interface ManualEntryProps {
  onSubmit: (spec: ManualModelSpec) => void;
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const INPUT_CLS = `
  w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2.5
  text-sm text-[#0F172A] placeholder-[#94A3B8]
  outline-none transition-colors duration-150
  focus:border-[#6366F1]
`;

const LABEL_CLS = 'block mb-1.5 text-sm font-medium text-[#475569]';

const SECTION_CLS = `
  rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-5
`;

const ARCHITECTURES = ['Dense', 'MoE'] as const;
const PRECISIONS = ['FP32', 'FP16', 'BF16', 'FP8'] as const;
const LICENSES = [
  'Apache 2.0',
  'MIT',
  'Llama 3 Community',
  'Gemma',
  'CC-BY-4.0',
  'CC-BY-NC-4.0',
  'Other / Proprietary',
] as const;

type ArchType = (typeof ARCHITECTURES)[number];
type Precision = (typeof PRECISIONS)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ManualEntry({ onSubmit }: ManualEntryProps) {
  // --- Identity ---
  const [modelName, setModelName] = useState('');
  const [organization, setOrganization] = useState('');

  // --- Parameters ---
  const [totalParams, setTotalParams] = useState('');
  const [activeParams, setActiveParams] = useState('');

  // --- Architecture ---
  const [archType, setArchType] = useState<ArchType>('Dense');
  const [experts, setExperts] = useState('');
  const [expertsPerToken, setExpertsPerToken] = useState('');
  const [layers, setLayers] = useState('');
  const [attentionHeads, setAttentionHeads] = useState('');
  const [kvHeads, setKvHeads] = useState('');
  const [hiddenSize, setHiddenSize] = useState('');
  const [intermediateSize, setIntermediateSize] = useState('');

  // --- Context & Vocab ---
  const [contextWindow, setContextWindow] = useState('');
  const [vocabSize, setVocabSize] = useState('');
  const [precision, setPrecision] = useState<Precision>('BF16');

  // --- Capabilities ---
  const [toolCalling, setToolCalling] = useState(false);
  const [structuredOutput, setStructuredOutput] = useState(false);
  const [reasoningTokens, setReasoningTokens] = useState(false);

  // --- Licensing ---
  const [license, setLicense] = useState<(typeof LICENSES)[number]>(LICENSES[0]);

  const isMoE = archType === 'MoE';

  /* ---- number helper ---- */
  const num = (v: string, fallback = 0) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleSubmit = useCallback(() => {
    const spec: ManualModelSpec = {
      modelName: modelName.trim() || 'Untitled Model',
      modelType: archType.toLowerCase(),
      parameterCount: num(totalParams),
      numHiddenLayers: num(layers),
      numAttentionHeads: num(attentionHeads),
      numKeyValueHeads: kvHeads ? num(kvHeads) : undefined,
      hiddenSize: num(hiddenSize),
      intermediateSize: num(intermediateSize),
      vocabSize: num(vocabSize),
      maxPositionEmbeddings: num(contextWindow),
      isMoE,
      numLocalExperts: isMoE && experts ? num(experts) : undefined,
      numExpertsPerTok: isMoE && expertsPerToken ? num(expertsPerToken) : undefined,
      torchDtype: precision.toLowerCase(),
    };
    onSubmit(spec);
  }, [
    modelName, archType, totalParams, layers, attentionHeads, kvHeads,
    hiddenSize, intermediateSize, vocabSize, contextWindow, isMoE,
    experts, expertsPerToken, precision, onSubmit,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="w-full space-y-6">
      {/* ---------- Identity ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          Model Identity
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLS}>Model name</label>
            <input
              className={INPUT_CLS}
              placeholder="e.g. Llama-4-Scout-17B"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Organization</label>
            <input
              className={INPUT_CLS}
              placeholder="e.g. meta-llama"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* ---------- Parameters ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          Parameters
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLS}>Total parameters (B)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={INPUT_CLS}
              placeholder="e.g. 27"
              value={totalParams}
              onChange={(e) => setTotalParams(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Active parameters (B)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={INPUT_CLS}
              placeholder="e.g. 3 (MoE only)"
              value={activeParams}
              onChange={(e) => setActiveParams(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* ---------- Architecture ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          Architecture
        </legend>

        {/* Architecture type selector */}
        <div className="mb-4">
          <label className={LABEL_CLS}>Architecture type</label>
          <select
            className={INPUT_CLS}
            value={archType}
            onChange={(e) => setArchType(e.target.value as ArchType)}
          >
            {ARCHITECTURES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* MoE-specific fields */}
        {isMoE && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLS}>Number of experts</label>
              <input
                type="number"
                min="1"
                className={INPUT_CLS}
                placeholder="e.g. 16"
                value={experts}
                onChange={(e) => setExperts(e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Experts per token</label>
              <input
                type="number"
                min="1"
                className={INPUT_CLS}
                placeholder="e.g. 2"
                value={expertsPerToken}
                onChange={(e) => setExpertsPerToken(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Core architecture fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={LABEL_CLS}>Layers</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 32"
              value={layers}
              onChange={(e) => setLayers(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Attention heads</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 32"
              value={attentionHeads}
              onChange={(e) => setAttentionHeads(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>KV heads</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 8"
              value={kvHeads}
              onChange={(e) => setKvHeads(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Hidden size</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 4096"
              value={hiddenSize}
              onChange={(e) => setHiddenSize(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Intermediate size</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 11008"
              value={intermediateSize}
              onChange={(e) => setIntermediateSize(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* ---------- Context & Precision ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          Context & Precision
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL_CLS}>Context window</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 131072"
              value={contextWindow}
              onChange={(e) => setContextWindow(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Vocabulary size</label>
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 256000"
              value={vocabSize}
              onChange={(e) => setVocabSize(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Precision</label>
            <select
              className={INPUT_CLS}
              value={precision}
              onChange={(e) => setPrecision(e.target.value as Precision)}
            >
              {PRECISIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* ---------- Capabilities ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          Capabilities
        </legend>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Checkbox label="Tool calling" checked={toolCalling} onChange={setToolCalling} />
          <Checkbox label="Structured output" checked={structuredOutput} onChange={setStructuredOutput} />
          <Checkbox label="Reasoning tokens" checked={reasoningTokens} onChange={setReasoningTokens} />
        </div>
      </fieldset>

      {/* ---------- License ---------- */}
      <fieldset className={SECTION_CLS}>
        <legend className="mb-4 text-base font-semibold text-[#0F172A]">
          License
        </legend>
        <select
          className={INPUT_CLS}
          value={license}
          onChange={(e) => setLicense(e.target.value as (typeof LICENSES)[number])}
        >
          {LICENSES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </fieldset>

      {/* ---------- Submit ---------- */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          className="
            rounded-lg bg-[#6366F1] px-6 py-3 text-sm font-medium
            text-white transition-colors duration-150
            hover:bg-[#5558E6] active:bg-[#4F46E5]
            cursor-pointer
          "
        >
          Run X-ray on manual spec
        </button>
        <p className="text-xs text-[#94A3B8] leading-relaxed max-w-md">
          Use manual entry for models under NDA or pre-release models where
          HuggingFace configs are not yet public.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkbox sub-component                                             */
/* ------------------------------------------------------------------ */

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[#475569]">
      <span
        className={`
          flex h-5 w-5 items-center justify-center rounded
          border transition-colors duration-150
          ${checked
            ? 'border-[#6366F1] bg-[#6366F1]'
            : 'border-[#E2E8F0] bg-[#FFFFFF]'
          }
        `}
      >
        {checked && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
