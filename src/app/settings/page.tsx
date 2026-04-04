'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { testConnection as testHFConnection } from '@/lib/api/huggingface';
import { testConnection as testCerebrasConnection } from '@/lib/api/cerebras';
import {
  DEFAULT_SCORING_WEIGHTS,
  WEIGHT_KEYS,
  validateWeights,
} from '@/lib/constants/scoringWeights';
import type { ScoringWeights } from '@/lib/types/model';

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_WEIGHTS = 'modelscope_weights';

// ---------------------------------------------------------------------------
// Weight labels (human-readable)
// ---------------------------------------------------------------------------

const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  architecture: 'Architecture',
  wseFit: 'WSE Fit',
  speedSensitivity: 'Speed Sensitivity',
  agenticFit: 'Agentic Fit',
  competitiveGap: 'Competitive Gap',
  demandSignal: 'Demand Signal',
  reapPotential: 'REAP Potential',
};

// ---------------------------------------------------------------------------
// Connection status type
// ---------------------------------------------------------------------------

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readWeights(): ScoringWeights {
  if (typeof window === 'undefined') return { ...DEFAULT_SCORING_WEIGHTS };
  try {
    const raw = localStorage.getItem(LS_WEIGHTS);
    if (!raw) return { ...DEFAULT_SCORING_WEIGHTS };
    const parsed = JSON.parse(raw) as ScoringWeights;
    if (validateWeights(parsed)) return parsed;
    return { ...DEFAULT_SCORING_WEIGHTS };
  } catch {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }
}

function writeWeights(w: ScoringWeights): void {
  try {
    localStorage.setItem(LS_WEIGHTS, JSON.stringify(w));
  } catch {
    // swallow
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-[#F9FAFB]">{children}</h2>
  );
}

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-[#6B7280]">{children}</p>;
}

// ---------------------------------------------------------------------------
// Connection Test Row
// ---------------------------------------------------------------------------

function ConnectionTestRow({
  label,
  description,
  status,
  onTest,
}: {
  label: string;
  description: string;
  status: ConnectionStatus;
  onTest: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#111827] px-5 py-4 transition-colors hover:border-[#374151]">
      <div>
        <p className="text-sm font-medium text-[#F9FAFB]">{label}</p>
        <p className="text-xs text-[#6B7280]">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {status === 'success' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Connected
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Failed — check Vercel env vars
          </span>
        )}
        <button
          type="button"
          onClick={onTest}
          disabled={status === 'testing'}
          className="shrink-0 rounded-lg border border-[#1F2937] px-4 py-2 text-sm font-medium text-[#9CA3AF] transition-colors hover:border-[#6366F1] hover:text-[#6366F1] disabled:opacity-40 disabled:pointer-events-none"
        >
          {status === 'testing' ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Testing...
            </span>
          ) : (
            'Test connection'
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weight Slider
// ---------------------------------------------------------------------------

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#9CA3AF]">{label}</span>
        <span className="rounded bg-[#111827] px-2 py-0.5 font-mono text-xs text-[#6366F1]">
          {pct}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full cursor-pointer accent-[#6366F1]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [hfStatus, setHfStatus] = useState<ConnectionStatus>('idle');
  const [cerebrasStatus, setCerebrasStatus] = useState<ConnectionStatus>('idle');

  // -- Weights state --
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_SCORING_WEIGHTS });

  const initialized = useRef(false);

  useEffect(() => {
    setWeights(readWeights());
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    writeWeights(weights);
  }, [weights]);

  // -- Test connections (server-side keys) --
  const handleTestHF = useCallback(async () => {
    setHfStatus('testing');
    const ok = await testHFConnection();
    setHfStatus(ok ? 'success' : 'error');
  }, []);

  const handleTestCerebras = useCallback(async () => {
    setCerebrasStatus('testing');
    const ok = await testCerebrasConnection();
    setCerebrasStatus(ok ? 'success' : 'error');
  }, []);

  // -- Normalize weights --
  const handleWeightChange = useCallback(
    (changedKey: keyof ScoringWeights, newValue: number) => {
      setWeights((prev) => {
        const clamped = Math.max(0, Math.min(1, newValue));
        const otherKeys = WEIGHT_KEYS.filter((k) => k !== changedKey);
        const otherSum = otherKeys.reduce((s, k) => s + prev[k], 0);

        const next = { ...prev, [changedKey]: clamped };

        if (otherSum < 1e-6) {
          const remainder = 1 - clamped;
          const each = remainder / otherKeys.length;
          for (const k of otherKeys) next[k] = each;
        } else {
          const scale = (1 - clamped) / otherSum;
          for (const k of otherKeys) next[k] = Math.max(0, prev[k] * scale);
        }

        const total = WEIGHT_KEYS.reduce((s, k) => s + next[k], 0);
        if (Math.abs(total - 1) > 1e-6) {
          for (const k of WEIGHT_KEYS) next[k] = next[k] / total;
        }
        return next;
      });
    },
    [],
  );

  const handleResetWeights = useCallback(() => {
    setWeights({ ...DEFAULT_SCORING_WEIGHTS });
  }, []);

  const isDefault = WEIGHT_KEYS.every(
    (k) => Math.abs(weights[k] - DEFAULT_SCORING_WEIGHTS[k]) < 1e-4,
  );

  const weightSum = WEIGHT_KEYS.reduce((s, k) => s + weights[k], 0);
  const sumPct = Math.round(weightSum * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 lg:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-[#F9FAFB]">Settings</h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        API keys are stored securely as Vercel environment variables — they never reach your browser.
      </p>

      {/* API Connections Section */}
      <section className="mt-10">
        <SectionHeading>API Connections</SectionHeading>
        <SectionDescription>
          Keys are configured via Vercel environment variables (HF_TOKEN, CEREBRAS_API_KEY). Test that they&apos;re working:
        </SectionDescription>

        <div className="mt-6 space-y-3">
          <ConnectionTestRow
            label="HuggingFace"
            description="Fetches model configs, metadata, and trending data"
            status={hfStatus}
            onTest={handleTestHF}
          />
          <ConnectionTestRow
            label="Cerebras Inference"
            description="Powers AI summary report generation (Qwen3-32B)"
            status={cerebrasStatus}
            onTest={handleTestCerebras}
          />
        </div>

        <div className="mt-4 rounded-lg border border-[#1F2937] bg-[#111827]/50 px-4 py-3">
          <p className="text-xs text-[#6B7280]">
            To update API keys, go to your Vercel project → Settings → Environment Variables, then redeploy.
          </p>
        </div>
      </section>

      <hr className="my-10 border-[#1F2937]" />

      {/* Scoring Weights Section */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionHeading>Scoring Weights</SectionHeading>
            <SectionDescription>
              Adjust how each module contributes to the composite score.
            </SectionDescription>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-xs ${
                sumPct === 100
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {sumPct}%
            </span>
            <button
              type="button"
              onClick={handleResetWeights}
              disabled={isDefault}
              className="rounded-lg border border-[#1F2937] px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:border-[#6366F1] hover:text-[#6366F1] disabled:opacity-30 disabled:pointer-events-none"
            >
              Reset to defaults
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {WEIGHT_KEYS.map((key) => (
            <WeightSlider
              key={key}
              label={WEIGHT_LABELS[key]}
              value={weights[key]}
              onChange={(v) => handleWeightChange(key, v)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
