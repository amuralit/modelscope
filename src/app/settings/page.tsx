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

const LS_HF_TOKEN = 'modelscope_hf_token';
const LS_CEREBRAS_KEY = 'modelscope_cerebras_key';
const LS_ANTHROPIC_KEY = 'modelscope_anthropic_key';
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

function readLS(key: string, fallback: string = ''): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or blocked -- swallow
  }
}

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
    <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
  );
}

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-text-muted">{children}</p>;
}

// ---------------------------------------------------------------------------
// API Key Row
// ---------------------------------------------------------------------------

function APIKeyRow({
  label,
  value,
  onChange,
  optional,
  status,
  onTest,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  status?: ConnectionStatus;
  onTest?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        {label}
        {optional && (
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-normal text-text-muted">
            optional
          </span>
        )}
      </label>

      <div className="flex gap-2">
        {/* Input with show/hide */}
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted transition-colors hover:text-text-secondary"
            aria-label={visible ? 'Hide' : 'Show'}
          >
            {visible ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Test button */}
        {onTest && (
          <button
            type="button"
            onClick={onTest}
            disabled={!value.trim() || status === 'testing'}
            className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:pointer-events-none"
          >
            {status === 'testing' ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Testing
              </span>
            ) : (
              'Test connection'
            )}
          </button>
        )}
      </div>

      {/* Status message */}
      {status === 'success' && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Connection successful
        </p>
      )}
      {status === 'error' && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Connection failed -- check your key
        </p>
      )}
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
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-accent">
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
        className="w-full cursor-pointer accent-accent"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  // -- API Keys state --
  const [hfToken, setHfToken] = useState('');
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  const [hfStatus, setHfStatus] = useState<ConnectionStatus>('idle');
  const [cerebrasStatus, setCerebrasStatus] = useState<ConnectionStatus>('idle');

  // -- Weights state --
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_SCORING_WEIGHTS });

  // Track whether initial load is done (to avoid writing defaults back)
  const initialized = useRef(false);

  // -- Load from localStorage on mount --
  useEffect(() => {
    setHfToken(readLS(LS_HF_TOKEN));
    setCerebrasKey(readLS(LS_CEREBRAS_KEY));
    setAnthropicKey(readLS(LS_ANTHROPIC_KEY));
    setWeights(readWeights());
    initialized.current = true;
  }, []);

  // -- Persist API keys on change --
  useEffect(() => {
    if (!initialized.current) return;
    writeLS(LS_HF_TOKEN, hfToken);
  }, [hfToken]);

  useEffect(() => {
    if (!initialized.current) return;
    writeLS(LS_CEREBRAS_KEY, cerebrasKey);
  }, [cerebrasKey]);

  useEffect(() => {
    if (!initialized.current) return;
    writeLS(LS_ANTHROPIC_KEY, anthropicKey);
  }, [anthropicKey]);

  // -- Persist weights on change --
  useEffect(() => {
    if (!initialized.current) return;
    writeWeights(weights);
  }, [weights]);

  // -- Test HuggingFace --
  const handleTestHF = useCallback(async () => {
    setHfStatus('testing');
    const ok = await testHFConnection(hfToken);
    setHfStatus(ok ? 'success' : 'error');
  }, [hfToken]);

  // -- Test Cerebras --
  const handleTestCerebras = useCallback(async () => {
    setCerebrasStatus('testing');
    const ok = await testCerebrasConnection(cerebrasKey);
    setCerebrasStatus(ok ? 'success' : 'error');
  }, [cerebrasKey]);

  // -- Normalize weights when one changes --
  const handleWeightChange = useCallback(
    (changedKey: keyof ScoringWeights, newValue: number) => {
      setWeights((prev) => {
        // Clamp input
        const clamped = Math.max(0, Math.min(1, newValue));
        const oldValue = prev[changedKey];
        const delta = clamped - oldValue;

        if (Math.abs(delta) < 1e-6) return prev;

        // Sum of all other weights
        const otherKeys = WEIGHT_KEYS.filter((k) => k !== changedKey);
        const otherSum = otherKeys.reduce((s, k) => s + prev[k], 0);

        const next = { ...prev, [changedKey]: clamped };

        if (otherSum < 1e-6) {
          // If all others are zero, distribute remainder evenly
          const remainder = 1 - clamped;
          const each = remainder / otherKeys.length;
          for (const k of otherKeys) {
            next[k] = each;
          }
        } else {
          // Scale others proportionally so total = 1.0
          const targetOtherSum = 1 - clamped;
          const scale = targetOtherSum / otherSum;
          for (const k of otherKeys) {
            next[k] = Math.max(0, prev[k] * scale);
          }
        }

        // Final normalization to avoid floating-point drift
        const total = WEIGHT_KEYS.reduce((s, k) => s + next[k], 0);
        if (Math.abs(total - 1) > 1e-6) {
          for (const k of WEIGHT_KEYS) {
            next[k] = next[k] / total;
          }
        }

        return next;
      });
    },
    [],
  );

  const handleResetWeights = useCallback(() => {
    setWeights({ ...DEFAULT_SCORING_WEIGHTS });
  }, []);

  // Check if weights match defaults
  const isDefault = WEIGHT_KEYS.every(
    (k) => Math.abs(weights[k] - DEFAULT_SCORING_WEIGHTS[k]) < 1e-4,
  );

  const weightSum = WEIGHT_KEYS.reduce((s, k) => s + weights[k], 0);
  const sumPct = Math.round(weightSum * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 lg:py-14">
      {/* Page title */}
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h1>
      <p className="mt-2 text-sm text-text-muted">
        Configure API keys and scoring parameters for ModelScope.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* API Keys Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="mt-10">
        <SectionHeading>API Keys</SectionHeading>
        <SectionDescription>
          Keys are stored in your browser only and never sent to any third-party server.
        </SectionDescription>

        <div className="mt-6 space-y-6">
          <APIKeyRow
            label="HuggingFace Token"
            value={hfToken}
            onChange={(v) => {
              setHfToken(v);
              if (hfStatus !== 'idle') setHfStatus('idle');
            }}
            status={hfStatus}
            onTest={handleTestHF}
          />

          <APIKeyRow
            label="Cerebras API Key"
            value={cerebrasKey}
            onChange={(v) => {
              setCerebrasKey(v);
              if (cerebrasStatus !== 'idle') setCerebrasStatus('idle');
            }}
            status={cerebrasStatus}
            onTest={handleTestCerebras}
          />

          <APIKeyRow
            label="Anthropic API Key"
            value={anthropicKey}
            onChange={setAnthropicKey}
            optional
          />
        </div>
      </section>

      {/* Divider */}
      <hr className="my-10 border-border" />

      {/* ----------------------------------------------------------------- */}
      {/* Scoring Weights Section */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <SectionHeading>Scoring Weights</SectionHeading>
            <SectionDescription>
              Adjust how each module contributes to the composite score.
            </SectionDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Sum indicator */}
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-xs ${
                sumPct === 100
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {sumPct}%
            </span>
            <button
              type="button"
              onClick={handleResetWeights}
              disabled={isDefault}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
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
